import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { createSessionToken } from '@/lib/session';

// Simple in-memory rate limiter for login attempts
const loginAttempts = new Map<string, { count: number; lastAttempt: number }>();
const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

function isLoginLocked(email: string): boolean {
  const entry = loginAttempts.get(email);
  if (!entry) return false;
  if (Date.now() - entry.lastAttempt > LOGIN_LOCKOUT_MS) {
    loginAttempts.delete(email);
    return false;
  }
  return entry.count >= MAX_LOGIN_ATTEMPTS;
}

function recordLoginAttempt(email: string): void {
  const entry = loginAttempts.get(email);
  if (entry && Date.now() - entry.lastAttempt <= LOGIN_LOCKOUT_MS) {
    entry.count++;
    entry.lastAttempt = Date.now();
  } else {
    loginAttempts.set(email, { count: 1, lastAttempt: Date.now() });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Rate limiting check
    if (isLoginLocked(normalizedEmail)) {
      return NextResponse.json(
        { error: 'Too many login attempts. Please try again in 15 minutes.' },
        { status: 429 }
      );
    }

    // Use the unified db interface (works with both Turso and Prisma)
    const user = await db.user.findUnique({ where: { email: normalizedEmail } });

    if (!user) {
      recordLoginAttempt(normalizedEmail);
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Verify password
    const computedHash = await hashPassword(password);
    const storedHash = user.password;

    if (computedHash !== storedHash) {
      recordLoginAttempt(normalizedEmail);
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Check if user is deactivated
    if (user.deactivated) {
      return NextResponse.json({ error: 'Your account has been deactivated. Contact support for assistance.' }, { status: 403 });
    }

    const sessionUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      isPremium: !!user.isPremium,
      referralCode: user.referralCode,
      role: user.role,
    };

    const token = createSessionToken(sessionUser);

    const response = NextResponse.json({
      user: sessionUser,
      message: 'Login successful',
    });

    response.cookies.set('session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
