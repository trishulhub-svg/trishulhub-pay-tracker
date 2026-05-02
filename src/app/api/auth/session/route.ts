import { NextResponse } from 'next/server';
import { getSession, createSessionToken } from '@/lib/session';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const sessionUser = await getSession();
    if (!sessionUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get fresh user data from DB in case isPremium or role changed
    const freshUser = await db.user.findUnique({
      where: { id: sessionUser.id },
      select: { isPremium: true, referralCode: true, name: true, email: true, role: true, deactivated: true },
    });

    // If user was deactivated, force logout
    if (freshUser?.deactivated) {
      const response = NextResponse.json({ error: 'Account deactivated' }, { status: 401 });
      response.cookies.set('session', '', { maxAge: 0, path: '/' });
      return response;
    }

    const user = {
      id: sessionUser.id,
      email: freshUser?.email ?? sessionUser.email,
      name: freshUser?.name ?? sessionUser.name,
      isPremium: !!(freshUser?.isPremium ?? sessionUser.isPremium),
      referralCode: freshUser?.referralCode ?? sessionUser.referralCode,
      role: freshUser?.role ?? sessionUser.role ?? 'USER',
    };

    const response = NextResponse.json({ user });

    // Update session cookie if isPremium, role, name, or referralCode changed
    const needsUpdate =
      user.isPremium !== sessionUser.isPremium ||
      user.role !== sessionUser.role ||
      user.name !== sessionUser.name ||
      user.referralCode !== sessionUser.referralCode ||
      user.email !== sessionUser.email;

    if (needsUpdate) {
      const newToken = createSessionToken(user);
      response.cookies.set('session', newToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24, // 24 hours
        path: '/',
      });
    }

    return response;
  } catch (error) {
    console.error('Session error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
