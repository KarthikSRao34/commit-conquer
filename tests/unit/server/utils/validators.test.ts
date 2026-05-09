/**
 * Unit tests for packages/server/src/utils/validators.ts
 * Covers: isValidEmail, isValidUsername, sanitizeString, isConventionalCommit
 */

import {
  isValidEmail,
  isValidUsername,
  sanitizeString,
  isConventionalCommit,
} from '../../../../packages/server/src/utils/validators';

// ---------------------------------------------------------------------------
// isValidEmail
// ---------------------------------------------------------------------------
describe('isValidEmail()', () => {
  const valid = [
    'user@example.com',
    'user.name+tag@sub.domain.org',
    'u@b.io',
    'test123@test.co.uk',
  ];

  const invalid = [
    '',
    'not-an-email',
    '@nodomain.com',
    'missing@',
    'no-at-sign',
    'double@@domain.com',
  ];

  it.each(valid)('accepts valid email: %s', (email) => {
    expect(isValidEmail(email)).toBe(true);
  });

  it.each(invalid)('rejects invalid email: %s', (email) => {
    expect(isValidEmail(email)).toBe(false);
  });

  it('returns false for non-string input', () => {
    expect(isValidEmail(null as any)).toBe(false);
    expect(isValidEmail(undefined as any)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isValidUsername
// ---------------------------------------------------------------------------
describe('isValidUsername()', () => {
  const valid = [
    'alice',
    'Bob123',
    'user-name',
    'user_name',
    'abc',
    'a'.repeat(30),
  ];

  const invalid = [
    '',
    'ab',             // too short (< 3 chars)
    'a'.repeat(31),   // too long (> 30 chars)
    'user name',      // contains space
    'user@name',      // contains @
    'user!',          // special char
  ];

  it.each(valid)('accepts valid username: %s', (name) => {
    expect(isValidUsername(name)).toBe(true);
  });

  it.each(invalid)('rejects invalid username: %s', (name) => {
    expect(isValidUsername(name)).toBe(false);
  });

  it('returns false for null input', () => {
    expect(isValidUsername(null as any)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// sanitizeString
// ---------------------------------------------------------------------------
describe('sanitizeString()', () => {
  it('trims leading and trailing whitespace', () => {
    expect(sanitizeString('  hello  ')).toBe('hello');
  });

  it('removes < and > characters to prevent XSS', () => {
    expect(sanitizeString('<script>alert(1)</script>')).toBe('scriptalert(1)/script');
  });

  it('handles empty string', () => {
    expect(sanitizeString('')).toBe('');
  });

  it('returns empty string for non-string input', () => {
    expect(sanitizeString(null as any)).toBe('');
    expect(sanitizeString(undefined as any)).toBe('');
  });

  it('leaves safe strings unchanged (aside from trim)', () => {
    expect(sanitizeString('Hello World 123!')).toBe('Hello World 123!');
  });
});

// ---------------------------------------------------------------------------
// isConventionalCommit
// ---------------------------------------------------------------------------
describe('isConventionalCommit()', () => {
  const valid = [
    'feat: add login page',
    'fix: resolve null pointer',
    'docs: update API docs',
    'style: format code',
    'refactor: extract helper',
    'perf: optimise DB query',
    'test: add unit tests',
    'build: update webpack config',
    'ci: add GitHub Actions',
    'chore: bump dependencies',
    'revert: undo last change',
    'feat(auth): add OAuth support',
    'fix!: breaking API change',
    'feat(scope)!: breaking scoped feature',
  ];

  const invalid = [
    '',
    'just a regular message',
    'FEAT: uppercase prefix not valid',
    'feature: not a recognised type',
    'feat',               // no colon or description
    'feat:no-space',      // missing space after colon
  ];

  it.each(valid)('accepts conventional commit: %s', (msg) => {
    expect(isConventionalCommit(msg)).toBe(true);
  });

  it.each(invalid)('rejects non-conventional commit: %s', (msg) => {
    expect(isConventionalCommit(msg)).toBe(false);
  });

  it('returns false for null input', () => {
    expect(isConventionalCommit(null as any)).toBe(false);
  });
});