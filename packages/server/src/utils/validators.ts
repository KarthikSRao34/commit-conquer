/**
 * packages/server/src/utils/validators.ts
 */

export function isValidEmail(value: any): boolean {
  if (typeof value !== 'string') return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function isValidUsername(value: any): boolean {
  if (typeof value !== 'string') return false;
  return /^[a-zA-Z0-9_-]{3,30}$/.test(value);
}

export function sanitizeString(value: any): string {
  if (typeof value !== 'string') return '';
  return value.trim().replace(/[<>]/g, '');
}

export function isConventionalCommit(value: any): boolean {
  if (typeof value !== 'string' || !value) return false;
  return /^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\([^)]+\))?!?: .+/.test(value);
}