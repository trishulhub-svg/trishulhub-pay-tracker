import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@libsql/client';
import { hashPassword } from '@/lib/auth';
import { createSessionToken } from '@/lib/session';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    // Connect directly to Turso (bypassing db.ts interface to test)
    const url = process.env.TURSO_DATABASE_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;

    if (!url || !authToken) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const client = createClient({ url, authToken });
    const r = await client.execute({ sql: 'SELECT * FROM User WHERE email = ?', args: [email] });
    const user = r.rows[0] as any || null;

    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Verify password
    const computedHash = await hashPassword(password);
    const storedHash = user.password;

    if (computedHash !== storedHash) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const sessionUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      isPremium: user.isPremium === 1 ? true : user.isPremium,
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
