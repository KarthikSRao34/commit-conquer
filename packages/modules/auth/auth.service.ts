import { type Customer, type AuthSession } from "../../core/types";
import { generateId, isValidEmail, sleep } from "../../core/utils";
import { eventBus, EVENT } from "../../core/event-bus";
import { ServiceError } from "../products/product.service";

export interface RegisterInput {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface UpdateProfileInput {
  first_name?: string;
  last_name?: string;
  phone?: string;
}

interface CustomerRecord {
  customer: Customer;
  password_hash: string;
  reset_token?: string;
  reset_token_expires?: string;
}

const customersByEmail = new Map<string, CustomerRecord>();
const customersById = new Map<string, CustomerRecord>();
const sessions = new Map<string, AuthSession>();

function _seed() {
  const id = "cust_demo_001";
  const record: CustomerRecord = {
    customer: {
      id,
      email: "demo@example.com",
      first_name: "Demo",
      last_name: "User",
      phone: "+1 555 000 0000",
      has_account: true,
      created_at: new Date().toISOString(),
    },
    password_hash: _hashPassword("password123"),
  };
  customersByEmail.set("demo@example.com", record);
  customersById.set(id, record);
}

_seed();

export const AuthService = {
  async register(
    input: RegisterInput,
  ): Promise<{ customer: Customer; token: string }> {
    _validateRegister(input);

    const emailKey = input.email.toLowerCase().trim();

    if (customersByEmail.has(emailKey)) {
      throw new ServiceError(
        "EMAIL_EXISTS",
        `An account with email "${emailKey}" already exists`,
      );
    }

    await sleep(150);

    const customer: Customer = {
      id: generateId("cust"),
      email: emailKey,
      first_name: input.first_name.trim(),
      last_name: input.last_name.trim(),
      phone: input.phone?.trim(),
      has_account: true,
      created_at: new Date().toISOString(),
    };

    const record: CustomerRecord = {
      customer,
      password_hash: _hashPassword(input.password),
    };

    customersByEmail.set(emailKey, record);
    customersById.set(customer.id, record);

    const token = _issueToken(customer.id);

    await eventBus.emit(EVENT.CUSTOMER_CREATED, {
      customer_id: customer.id,
      email: customer.email,
    });

    return { customer, token };
  },

  async login(
    input: LoginInput,
  ): Promise<{ customer: Customer; token: string }> {
    if (!input.email || !input.password) {
      throw new ServiceError(
        "VALIDATION_ERROR",
        "Email and password are required",
      );
    }

    const emailKey = input.email.toLowerCase().trim();
    const record = customersByEmail.get(emailKey);

    await sleep(150);

    if (!record || !_verifyPassword(input.password, record.password_hash)) {
      throw new ServiceError(
        "INVALID_CREDENTIALS",
        "Invalid email or password",
      );
    }

    const token = _issueToken(record.customer.id);

    await eventBus.emit(EVENT.CUSTOMER_LOGGED_IN, {
      customer_id: record.customer.id,
    });

    return { customer: record.customer, token };
  },

  async logout(token: string): Promise<void> {
    const session = sessions.get(token);
    if (!session) return; // already gone — idempotent

    sessions.delete(token);

    await eventBus.emit(EVENT.CUSTOMER_LOGGED_OUT, {
      customer_id: session.customer_id,
    });
  },

  validateToken(token: string): Customer {
    const session = sessions.get(token);

    if (!session) {
      throw new ServiceError(
        "INVALID_TOKEN",
        "Session not found — please log in again",
      );
    }

    if (new Date(session.expires_at) < new Date()) {
      sessions.delete(token);
      throw new ServiceError(
        "TOKEN_EXPIRED",
        "Session expired — please log in again",
      );
    }

    const record = customersById.get(session.customer_id);
    if (!record) {
      throw new ServiceError(
        "CUSTOMER_NOT_FOUND",
        "Customer account not found",
      );
    }

    return record.customer;
  },

  getById(id: string): Customer {
    const record = customersById.get(id);
    if (!record)
      throw new ServiceError("CUSTOMER_NOT_FOUND", `Customer ${id} not found`);
    return record.customer;
  },

  getByEmail(email: string): Customer {
    const record = customersByEmail.get(email.toLowerCase().trim());
    if (!record)
      throw new ServiceError("CUSTOMER_NOT_FOUND", `No account for ${email}`);
    return record.customer;
  },

  async updateProfile(
    customerId: string,
    input: UpdateProfileInput,
  ): Promise<Customer> {
    const record = customersById.get(customerId);
    if (!record)
      throw new ServiceError(
        "CUSTOMER_NOT_FOUND",
        `Customer ${customerId} not found`,
      );

    if (input.first_name !== undefined) {
      record.customer.first_name = input.first_name.trim();
    }
    if (input.last_name !== undefined) {
      record.customer.last_name = input.last_name.trim();
    }
    if (input.phone !== undefined) {
      record.customer.phone = input.phone.trim();
    }

    customersById.set(customerId, record);
    customersByEmail.set(record.customer.email, record);

    return record.customer;
  },

  async changePassword(
    customerId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const record = customersById.get(customerId);
    if (!record)
      throw new ServiceError(
        "CUSTOMER_NOT_FOUND",
        `Customer ${customerId} not found`,
      );

    await sleep(150);

    if (!_verifyPassword(currentPassword, record.password_hash)) {
      throw new ServiceError(
        "INVALID_CREDENTIALS",
        "Current password is incorrect",
      );
    }

    _validatePasswordStrength(newPassword);

    record.password_hash = _hashPassword(newPassword);

    customersById.set(customerId, record);
    customersByEmail.set(record.customer.email, record);

    for (const [token, session] of sessions.entries()) {
      if (session.customer_id === customerId) {
        sessions.delete(token);
      }
    }
  },

  async requestPasswordReset(email: string): Promise<{ reset_token: string }> {
    const emailKey = email.toLowerCase().trim();
    const record = customersByEmail.get(emailKey);

    await sleep(200);

    if (!record) {
      return { reset_token: "noop" };
    }

    const reset_token = _generateResetToken();
    const expires = new Date(Date.now() + 1000 * 60 * 60);

    record.reset_token = reset_token;
    record.reset_token_expires = expires.toISOString();

    customersById.set(record.customer.id, record);
    customersByEmail.set(emailKey, record);

    await eventBus.emit(EVENT.PASSWORD_RESET, {
      customer_id: record.customer.id,
      email: emailKey,
    });

    console.log(
      `[AuthService] Password reset token for ${emailKey}: ${reset_token}`,
    );

    return { reset_token };
  },

  async confirmPasswordReset(
    reset_token: string,
    new_password: string,
  ): Promise<void> {
    _validatePasswordStrength(new_password);

    // Find the customer with this token
    let found: CustomerRecord | undefined;
    for (const record of customersById.values()) {
      if (record.reset_token === reset_token) {
        found = record;
        break;
      }
    }

    if (!found) {
      throw new ServiceError(
        "INVALID_TOKEN",
        "Reset token is invalid or has already been used",
      );
    }

    if (
      !found.reset_token_expires ||
      new Date(found.reset_token_expires) < new Date()
    ) {
      throw new ServiceError(
        "TOKEN_EXPIRED",
        "Reset token has expired — please request a new one",
      );
    }

    await sleep(150);

    found.password_hash = _hashPassword(new_password);
    found.reset_token = undefined;
    found.reset_token_expires = undefined;

    customersById.set(found.customer.id, found);
    customersByEmail.set(found.customer.email, found);

    // Invalidate all sessions
    for (const [token, session] of sessions.entries()) {
      if (session.customer_id === found.customer.id) {
        sessions.delete(token);
      }
    }
  },

  async googleLogin(
    googleToken: string,
  ): Promise<{ customer: Customer; token: string }> {
    const payload = _decodeGoogleToken(googleToken);

    const email = payload.email;
    if (!email) {
      throw new ServiceError("VALIDATION_ERROR", "Google account has no email");
    }

    const emailKey = email.toLowerCase().trim();
    let record = customersByEmail.get(emailKey);

    if (!record) {
      const customer: Customer = {
        id: generateId("cust"),
        email: emailKey,
        first_name: payload.given_name || payload.name || "Google",
        last_name: payload.family_name || "User",
        has_account: true,
        created_at: new Date().toISOString(),
      };

      record = { customer, password_hash: "" };
      customersByEmail.set(emailKey, record);
      customersById.set(customer.id, record);

      await eventBus.emit(EVENT.CUSTOMER_CREATED, {
        customer_id: customer.id,
        email: customer.email,
      });
    }

    const token = _issueToken(record.customer.id);
    return { customer: record.customer, token };
  },

  activeSessions(customerId: string): AuthSession[] {
    return [...sessions.values()].filter(
      (s) =>
        s.customer_id === customerId && new Date(s.expires_at) > new Date(),
    );
  },
};

function _issueToken(customerId: string): string {
  const token = `tok_${customerId}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const expires_at = new Date(
    Date.now() + 1000 * 60 * 60 * 24 * 7,
  ).toISOString();

  const session: AuthSession = {
    customer_id: customerId,
    token,
    expires_at,
  };

  sessions.set(token, session);
  return token;
}

function _hashPassword(password: string): string {
  const salt = "cc_salt_v1_";
  const salted = salt + password;
  let hash = 0;
  for (let i = 0; i < salted.length; i++) {
    hash = ((hash << 5) - hash + salted.charCodeAt(i)) | 0;
  }
  return `mock_${Math.abs(hash).toString(16).padStart(8, "0")}`;
}

function _verifyPassword(password: string, hash: string): boolean {
  return _hashPassword(password) === hash;
}

function _generateResetToken(): string {
  return `rst_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
}

function _validatePasswordStrength(password: string): void {
  if (!password || password.length < 8) {
    throw new ServiceError(
      "WEAK_PASSWORD",
      "Password must be at least 8 characters long",
    );
  }
}

function _validateRegister(input: RegisterInput): void {
  if (!input.email || !isValidEmail(input.email)) {
    throw new ServiceError(
      "VALIDATION_ERROR",
      "A valid email address is required",
    );
  }
  if (!input.first_name?.trim()) {
    throw new ServiceError("VALIDATION_ERROR", "First name is required");
  }
  if (!input.last_name?.trim()) {
    throw new ServiceError("VALIDATION_ERROR", "Last name is required");
  }
  _validatePasswordStrength(input.password);
}

function _decodeGoogleToken(token: string): Record<string, any> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) {
      throw new Error("Invalid JWT");
    }
    const decoded = Buffer.from(parts[1], "base64url").toString("utf8");
    return JSON.parse(decoded);
  } catch {
    throw new ServiceError("VALIDATION_ERROR", "Invalid Google token");
  }
}