import { cookies } from 'next/headers';
import crypto from 'crypto';

const SESSION_SECRET = process.env.SESSION_SECRET || 'trishulhub-pay-tracker-secret-key-change-in-production';

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  isPremium: boolean;
  referralCode: string;
}

export function createSessionToken(user: SessionUser): string {
  const payload = JSON.stringify({
    ...user,
    exp: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
  });
  const encoded = Buffer.from(payload).toString('base64');
  const signature = createSignature(encoded);
  return `${encoded}.${signature}`;
}

export function verifySessionToken(token: string): SessionUser | null {
  try {
    const [encoded, signature] = token.split('.');
    if (!encoded || !signature) return null;
    if (createSignature(encoded) !== signature) return null;
    const payload = JSON.parse(Buffer.from(encoded, 'base64').toString());
    if (payload.exp < Date.now()) return null;
    return {
      id: payload.id,
      email: payload.email,
      name: payload.name,
      isPremium: payload.isPremium ?? false,
      referralCode: payload.referralCode ?? '',
    };
  } catch {
    return null;
  }
}

function createSignature(data: string): string {
  return crypto.createHmac('sha256', SESSION_SECRET).update(data).digest('hex');
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('session')?.value;
  if (!token) return null;
  return verifySessionToken(token);
}
