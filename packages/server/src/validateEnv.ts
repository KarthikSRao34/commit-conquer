// packages/server/src/validateEnv.ts
//
// Validates that all required environment variables are present at startup.
// Fails fast with a clear, actionable error message instead of allowing
// the server to boot and crash at runtime when an env var is first accessed.

// ─── Types ────────────────────────────────────────────────────────────────────

interface EnvVarRule {
  /** Environment variable name (e.g. "STRIPE_KEY") */
  name: string;
  /** If true, the server will refuse to start without this variable */
  required: boolean;
  /** Human-readable description shown in error messages */
  description: string;
  /** Optional default value — if set, the var is NOT required */
  defaultValue?: string;
  /**
   * Optional validator. Return an error string if the value is invalid,
   * or undefined/null if it passes.
   */
  validate?: (value: string) => string | undefined;
}

// ─── Environment Variable Definitions ─────────────────────────────────────────
//
// Add new env vars here as the project grows.
// Variables with a `defaultValue` are optional at startup; the default is
// applied automatically if the var is missing.

const ENV_VARS: EnvVarRule[] = [
  // ── Server ──
  {
    name: "PORT",
    required: false,
    description: "HTTP port the server listens on",
    defaultValue: "4000",
    validate: (v) => {
      const n = parseInt(v, 10);
      if (isNaN(n) || n < 1 || n > 65535) return "Must be a valid port number (1–65535)";
    },
  },
  {
    name: "NODE_ENV",
    required: false,
    description: "Runtime environment (development | production | test)",
    defaultValue: "development",
    validate: (v) => {
      if (!["development", "production", "test"].includes(v)) {
        return 'Must be one of: development, production, test';
      }
    },
  },
  {
    name: "CORS_ORIGIN",
    required: false,
    description: "Allowed CORS origin for the storefront",
    defaultValue: "http://localhost:5173",
  },
  {
    name: "ADMIN_SECRET",
    required: false,
    description: "Secret header value for admin-only routes (required in production)",
    defaultValue: "admin_dev_secret",
  },

  // ── Stripe ──
  {
    name: "STRIPE_KEY",
    required: false,
    description: "Stripe secret API key (required in production for payment processing)",
    validate: (v) => {
      if (v && !v.startsWith("sk_")) {
        return 'Stripe secret keys must start with "sk_"';
      }
    },
  },
  {
    name: "STRIPE_WEBHOOK_SECRET",
    required: false,
    description: "Stripe webhook endpoint signing secret (required in production)",
    validate: (v) => {
      if (v && !v.startsWith("whsec_")) {
        return 'Stripe webhook secrets must start with "whsec_"';
      }
    },
  },

  // ── Database ──
  {
    name: "DB_URL",
    required: false,
    description: "Database connection string (required in production)",
    validate: (v) => {
      if (v && !v.startsWith("postgres://") && !v.startsWith("postgresql://") && !v.startsWith("mysql://") && !v.startsWith("mongodb://") && !v.startsWith("mongodb+srv://")) {
        return "Must be a valid database connection URI (postgres://, mysql://, mongodb://)";
      }
    },
  },
];

// ─── Production-Only Requirements ─────────────────────────────────────────────
//
// These variables are optional in development (where mocks/defaults are fine)
// but MUST be set when NODE_ENV=production.

const PRODUCTION_REQUIRED: string[] = [
  "ADMIN_SECRET",
  "STRIPE_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "DB_URL",
];

// ─── Validation Result ────────────────────────────────────────────────────────

export interface EnvValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  applied: Record<string, string>;  // vars where defaults were applied
}

// ─── validateEnv ──────────────────────────────────────────────────────────────

/**
 * Validates all environment variables against the rules defined above.
 *
 * - Missing required vars → fatal errors (server will not start).
 * - Missing production-required vars in production → fatal errors.
 * - Missing optional vars with defaults → apply defaults + warn.
 * - Invalid values → fatal errors.
 *
 * @returns A result object. If `valid` is false, the caller should
 *          log the errors and `process.exit(1)`.
 */
export function validateEnv(): EnvValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const applied: Record<string, string> = {};

  const isProduction = (process.env.NODE_ENV ?? "development") === "production";

  for (const rule of ENV_VARS) {
    const value = process.env[rule.name];

    // ── Check presence ──
    if (value === undefined || value === "") {
      // Is it required in all environments?
      if (rule.required) {
        errors.push(
          `  ✗ ${rule.name} is required but not set.\n` +
          `    → ${rule.description}`,
        );
        continue;
      }

      // Is it required in production?
      if (isProduction && PRODUCTION_REQUIRED.includes(rule.name)) {
        errors.push(
          `  ✗ ${rule.name} is required in production but not set.\n` +
          `    → ${rule.description}`,
        );
        continue;
      }

      // Apply default if available
      if (rule.defaultValue !== undefined) {
        process.env[rule.name] = rule.defaultValue;
        applied[rule.name] = rule.defaultValue;
      } else {
        warnings.push(
          `  ⚠ ${rule.name} is not set (optional).\n` +
          `    → ${rule.description}`,
        );
      }

      continue;
    }

    // ── Validate format ──
    if (rule.validate) {
      const validationError = rule.validate(value);
      if (validationError) {
        errors.push(
          `  ✗ ${rule.name} has an invalid value: ${validationError}\n` +
          `    → Current value: "${value}"`,
        );
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    applied,
  };
}

// ─── Boot Guard ───────────────────────────────────────────────────────────────

/**
 * Run this at the very top of your server entry point, right after
 * `import "dotenv/config"`. If validation fails, the process exits
 * with code 1 and prints clear instructions.
 */
export function enforceEnv(): void {
  const result = validateEnv();

  // Show warnings (non-fatal)
  if (result.warnings.length > 0) {
    console.warn(
      "\n⚠  Environment variable warnings:\n" +
      result.warnings.join("\n\n") +
      "\n",
    );
  }

  // Show defaults that were applied
  if (Object.keys(result.applied).length > 0) {
    const lines = Object.entries(result.applied)
      .map(([k, v]) => `    ${k} = ${v}`)
      .join("\n");
    console.info(`\nℹ  Applied default values:\n${lines}\n`);
  }

  // Fatal errors — refuse to start
  if (!result.valid) {
    console.error(
      "\n" +
      "╔══════════════════════════════════════════════════════════════╗\n" +
      "║          MISSING OR INVALID ENVIRONMENT VARIABLES           ║\n" +
      "╠══════════════════════════════════════════════════════════════╣\n" +
      "║  The server cannot start until these issues are resolved:   ║\n" +
      "╚══════════════════════════════════════════════════════════════╝\n",
    );
    console.error(result.errors.join("\n\n"));
    console.error(
      "\n" +
      "──────────────────────────────────────────────────────────────\n" +
      "  Fix: Copy .env.example to .env and fill in the values.\n" +
      "       See README.MD for configuration details.\n" +
      "──────────────────────────────────────────────────────────────\n",
    );
    process.exit(1);
  }
}
