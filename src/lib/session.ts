import { cookies } from 'next/headers';
import crypto from 'crypto';

function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret === 'trishulhub-pay-tracker-secret-key-change-in-production') {
    if (process.env.NODE_ENV === 'production') {
      console.error('[SECURITY] SESSION_SECRET is not set or is using the default value in production. Set a strong random string in your environment variables.');
    }
    // Use default in development only; production will log a warning
    return secret || 'trishulhub-dev-secret-do-not-use-in-production';
  }
  return secret;
}

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  isPremium: boolean;
  referralCode: string;
  role: string;
}

// AES-256-GCM encryption for session payload (SEC-003)
// Prevents users from reading session data via base64 decode
function encryptPayload(payload: string): string {
  const secret = getSessionSecret();
  // Derive a 32-byte key from the secret using SHA-256
  const key = crypto.createHash('sha256').update(secret).digest();
  const iv = crypto.randomBytes(12);

  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  let encrypted = cipher.update(payload, 'utf8');
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  const authTag = cipher.getAuthTag();

  // Format: iv:authTag:encrypted (all base64url)
  return [iv, authTag, encrypted]
    .map(buf => buf.toString('base64url'))
    .join('.');
}

function decryptPayload(encryptedStr: string): string | null {
  try {
    const secret = getSessionSecret();
    const key = crypto.createHash('sha256').update(secret).digest();
    const parts = encryptedStr.split('.');
    if (parts.length !== 3) return null;

    const iv = Buffer.from(parts[0], 'base64url');
    const authTag = Buffer.from(parts[1], 'base64url');
    const encrypted = Buffer.from(parts[2], 'base64url');

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString('utf8');
  } catch {
    return null;
  }
}

function createSignature(data: string): string {
  return crypto.createHmac('sha256', getSessionSecret()).update(data).digest('hex');
}

export function createSessionToken(user: SessionUser): string {
  const payload = JSON.stringify({
    ...user,
    exp: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
  });
  const encrypted = encryptPayload(payload);
  const signature = createSignature(encrypted);
  return `${encrypted}.${signature}`;
}

export function verifySessionToken(token: string): SessionUser | null {
  try {
    const lastDot = token.lastIndexOf('.');
    if (lastDot === -1) return null;
    const encrypted = token.substring(0, lastDot);
    const signature = token.substring(lastDot + 1);
    if (!encrypted || !signature) return null;
    if (createSignature(encrypted) !== signature) return null;

    const payloadStr = decryptPayload(encrypted);
    if (!payloadStr) return null;

    const payload = JSON.parse(payloadStr);
    if (payload.exp < Date.now()) return null;
    return {
      id: payload.id,
      email: payload.email,
      name: payload.name,
      isPremium: payload.isPremium ?? false,
      referralCode: payload.referralCode ?? '',
      role: payload.role ?? 'USER',
    };
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('session')?.value;
  if (!token) return null;
  return verifySessionToken(token);
}
