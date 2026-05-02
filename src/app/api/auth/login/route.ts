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

    console.log('[LOGIN] Attempt for:', email);

    const user = await db.user.findUnique({ where: { email } });

    if (!user) {
      console.log('[LOGIN] User not found:', email);
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    console.log('[LOGIN] User found:', user.id, user.email, 'role:', user.role);
    console.log('[LOGIN] Stored password type:', typeof user.password, 'length:', user.password?.length);

    // Direct hash comparison
    const computedHash = await hashPassword(password);
    const storedHash = user.password;

    console.log('[LOGIN] Computed hash:', computedHash.substring(0, 20) + '...');
    console.log('[LOGIN] Stored hash:  ', storedHash?.substring(0, 20) + '...');
    console.log('[LOGIN] Hash match:', computedHash === storedHash);

    const isValid = computedHash === storedHash;
    if (!isValid) {
      console.log('[LOGIN] Password mismatch for:', email);
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const sessionUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      isPremium: user.isPremium === 1 ? true : user.isPremium, // Handle SQLite 0/1
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
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/',
    });

    console.log('[LOGIN] Success for:', email);
    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
