import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { validateEnv } from '../../../../packages/server/src/validateEnv';

describe('validateEnv', () => {
  const ORIGINAL_ENV = { ...process.env };

  beforeEach(() => {
    // Reset to a minimal valid env for each test
    process.env = {
      ...ORIGINAL_ENV,
      NODE_ENV: 'test',
      PORT: '3099',
      CORS_ORIGIN: 'http://localhost:3000',
    };
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  // ── Happy path ────────────────────────────────────────────────────────────

  it('should pass validation with default development config', () => {
    process.env.NODE_ENV = 'development';
    const result = validateEnv();
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should apply default values for missing optional vars', () => {
    delete process.env.PORT;
    delete process.env.NODE_ENV;
    delete process.env.CORS_ORIGIN;
    delete process.env.ADMIN_SECRET;

    const result = validateEnv();

    expect(result.valid).toBe(true);
    expect(result.applied).toHaveProperty('PORT', '4000');
    expect(result.applied).toHaveProperty('NODE_ENV', 'development');
    expect(result.applied).toHaveProperty('CORS_ORIGIN', 'http://localhost:5173');
    expect(result.applied).toHaveProperty('ADMIN_SECRET', 'admin_dev_secret');
  });

  // ── PORT validation ───────────────────────────────────────────────────────

  it('should reject invalid PORT values', () => {
    process.env.PORT = 'not-a-number';
    const result = validateEnv();
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('PORT'))).toBe(true);
  });

  it('should reject PORT out of range', () => {
    process.env.PORT = '99999';
    const result = validateEnv();
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('PORT'))).toBe(true);
  });

  it('should accept valid PORT', () => {
    process.env.PORT = '8080';
    const result = validateEnv();
    expect(result.errors.some(e => e.includes('PORT'))).toBe(false);
  });

  // ── NODE_ENV validation ───────────────────────────────────────────────────

  it('should reject invalid NODE_ENV values', () => {
    process.env.NODE_ENV = 'staging';
    const result = validateEnv();
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('NODE_ENV'))).toBe(true);
  });

  // ── STRIPE_KEY validation ─────────────────────────────────────────────────

  it('should reject STRIPE_KEY that does not start with sk_', () => {
    process.env.STRIPE_KEY = 'pk_test_abc123';
    const result = validateEnv();
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('STRIPE_KEY'))).toBe(true);
  });

  it('should accept valid STRIPE_KEY', () => {
    process.env.STRIPE_KEY = 'sk_test_abc123';
    const result = validateEnv();
    expect(result.errors.some(e => e.includes('STRIPE_KEY'))).toBe(false);
  });

  it('should warn when STRIPE_KEY is not set in development', () => {
    delete process.env.STRIPE_KEY;
    process.env.NODE_ENV = 'development';
    const result = validateEnv();
    expect(result.valid).toBe(true);
    expect(result.warnings.some(w => w.includes('STRIPE_KEY'))).toBe(true);
  });

  // ── DB_URL validation ─────────────────────────────────────────────────────

  it('should reject DB_URL with invalid protocol', () => {
    process.env.DB_URL = 'http://localhost:5432/mydb';
    const result = validateEnv();
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('DB_URL'))).toBe(true);
  });

  it('should accept valid postgres DB_URL', () => {
    process.env.DB_URL = 'postgres://user:pass@localhost:5432/mydb';
    const result = validateEnv();
    expect(result.errors.some(e => e.includes('DB_URL'))).toBe(false);
  });

  it('should accept valid mongodb DB_URL', () => {
    process.env.DB_URL = 'mongodb://user:pass@localhost:27017/mydb';
    const result = validateEnv();
    expect(result.errors.some(e => e.includes('DB_URL'))).toBe(false);
  });

  it('should warn when DB_URL is not set in development', () => {
    delete process.env.DB_URL;
    process.env.NODE_ENV = 'development';
    const result = validateEnv();
    expect(result.valid).toBe(true);
    expect(result.warnings.some(w => w.includes('DB_URL'))).toBe(true);
  });

  // ── Production mode enforcement ───────────────────────────────────────────

  it('should require STRIPE_KEY in production', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.STRIPE_KEY;
    const result = validateEnv();
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('STRIPE_KEY'))).toBe(true);
    expect(result.errors.some(e => e.includes('required in production'))).toBe(true);
  });

  it('should require DB_URL in production', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.DB_URL;
    const result = validateEnv();
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('DB_URL'))).toBe(true);
  });

  it('should require STRIPE_WEBHOOK_SECRET in production', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.STRIPE_WEBHOOK_SECRET;
    const result = validateEnv();
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('STRIPE_WEBHOOK_SECRET'))).toBe(true);
  });

  it('should require ADMIN_SECRET in production', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.ADMIN_SECRET;
    const result = validateEnv();
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('ADMIN_SECRET'))).toBe(true);
  });

  it('should pass production validation when all required vars are set', () => {
    process.env.NODE_ENV = 'production';
    process.env.ADMIN_SECRET = 'super_secret_admin';
    process.env.STRIPE_KEY = 'sk_live_abc123';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_abc123';
    process.env.DB_URL = 'postgres://user:pass@db.example.com:5432/prod';
    const result = validateEnv();
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  // ── STRIPE_WEBHOOK_SECRET validation ──────────────────────────────────────

  it('should reject STRIPE_WEBHOOK_SECRET that does not start with whsec_', () => {
    process.env.STRIPE_WEBHOOK_SECRET = 'invalid_secret';
    const result = validateEnv();
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('STRIPE_WEBHOOK_SECRET'))).toBe(true);
  });

  it('should accept valid STRIPE_WEBHOOK_SECRET', () => {
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test123';
    const result = validateEnv();
    expect(result.errors.some(e => e.includes('STRIPE_WEBHOOK_SECRET'))).toBe(false);
  });
});
