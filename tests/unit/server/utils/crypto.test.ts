/**
 * Unit tests for packages/server/src/utils/crypto.ts
 * Covers: hashString, generateToken, decodeToken
 */

import {
  hashString,
  generateToken,
  decodeToken,
} from '../../../../packages/server/src/utils/crypto';

// ---------------------------------------------------------------------------
// hashString
// ---------------------------------------------------------------------------
describe('hashString()', () => {
  it('returns a non-empty string for valid input', () => {
    expect(hashString('hello')).toBeTruthy();
  });

  it('returns a 64-character hex string (SHA-256)', () => {
    expect(hashString('test')).toHaveLength(64);
  });

  it('is deterministic — same input always gives same output', () => {
    expect(hashString('password123')).toBe(hashString('password123'));
  });

  it('produces different hashes for different inputs', () => {
    expect(hashString('abc')).not.toBe(hashString('xyz'));
  });

  it('handles special characters', () => {
    expect(hashString('p@$$w0rd!#%^&*()')).toHaveLength(64);
  });

  it('handles unicode input', () => {
    expect(hashString('こんにちは')).toHaveLength(64);
  });

  it('handles a very long string', () => {
    expect(hashString('a'.repeat(10_000))).toHaveLength(64);
  });

  it('returns empty string for empty input', () => {
    expect(hashString('')).toBe('');
  });
});

// ---------------------------------------------------------------------------
// generateToken
// ---------------------------------------------------------------------------
describe('generateToken()', () => {
  it('returns a non-empty string', () => {
    expect(generateToken('user-1')).toBeTruthy();
  });

  it('encodes the userId into the token payload', () => {
    const token = generateToken('user-abc');
    const decoded = Buffer.from(token, 'base64').toString('utf8');
    expect(decoded).toContain('user-abc');
  });

  it('produces a unique token on each call (random component)', () => {
    const t1 = generateToken('user-1');
    const t2 = generateToken('user-1');
    expect(t1).not.toBe(t2);
  });

  it('works with numeric-style user IDs', () => {
    expect(generateToken('42')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// decodeToken
// ---------------------------------------------------------------------------
describe('decodeToken()', () => {
  it('decodes a token produced by generateToken()', () => {
    const token = generateToken('user-xyz');
    const result = decodeToken(token);
    expect(result).not.toBeNull();
    expect(result?.userId).toBe('user-xyz');
  });

  it('returns null for an empty string', () => {
    expect(decodeToken('')).toBeNull();
  });

  it('returns null for a token with no userId part', () => {
    // base64 of ":timestamp:random" — userId segment is empty
    const token = Buffer.from(':1234567890:0.5').toString('base64');
    expect(decodeToken(token)).toBeNull();
  });

  it('round-trips correctly for multiple user IDs', () => {
    const ids = ['user-1', 'user-abc-123', 'admin'];
    ids.forEach((id) => {
      const token = generateToken(id);
      expect(decodeToken(token)?.userId).toBe(id);
    });
  });
});