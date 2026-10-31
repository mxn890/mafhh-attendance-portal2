import { randomInt } from 'node:crypto';
export function tempPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  return Array.from({length: 12}, () => chars[randomInt(chars.length)]).join('');
}
