/**
 * packages/server/src/utils/crypto.ts
 */

import { createHash, randomBytes } from 'crypto';

export function hashString(input: string): string {
  if (!input) return '';
  return createHash('sha256').update(input).digest('hex');
}

export function generateToken(userId: string): string {
  const random = randomBytes(16).toString('hex');
  const payload = `${userId}:${Date.now()}:${random}`;
  return Buffer.from(payload).toString('base64');
}

export function decodeToken(token: string): { userId: string } | null {
  if (!token) return null;
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf8');
    const [userId] = decoded.split(':');
    if (!userId) return null;
    return { userId };
  } catch {
    return null;
  }
}