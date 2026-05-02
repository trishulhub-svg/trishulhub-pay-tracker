import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { createSessionToken } from '@/lib/session';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    // Use the unified db interface (works with both Turso and Prisma)
    const user = await db.user.findUnique({ where: { email: email.toLowerCase().trim() } });

    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Verify password
    const computedHash = await hashPassword(password);
    const storedHash = user.password;

    if (computedHash !== storedHash) {
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
