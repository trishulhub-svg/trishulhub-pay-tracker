import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
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
      select: { isPremium: true, referralCode: true, name: true, email: true, role: true },
    });

    const user = {
      id: sessionUser.id,
      email: freshUser?.email ?? sessionUser.email,
      name: freshUser?.name ?? sessionUser.name,
      isPremium: freshUser?.isPremium ?? sessionUser.isPremium,
      referralCode: freshUser?.referralCode ?? sessionUser.referralCode,
      role: freshUser?.role ?? sessionUser.role ?? 'USER',
    };

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Session error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
