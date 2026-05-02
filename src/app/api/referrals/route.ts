import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/session';

export async function GET() {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Count how many users were referred by this user
    const referralCount = await db.user.count({
      where: { referredBy: user.referralCode },
    });

    // Get the full user data for premium status
    const fullUser = await db.user.findUnique({
      where: { id: user.id },
      select: { isPremium: true, referralCode: true, referredBy: true },
    });

    return NextResponse.json({
      referralCode: fullUser?.referralCode || user.referralCode,
      referralCount,
      isPremium: fullUser?.isPremium ?? user.isPremium,
      referredBy: fullUser?.referredBy || null,
    });
  } catch (error) {
    console.error('Referrals error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
