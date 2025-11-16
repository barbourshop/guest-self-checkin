import { createHash } from 'crypto';

export function customerHash(customerId: string, salt: string): string {
  return createHash('sha256').update(`${customerId}:${salt}`).digest('base64url');
}

