import { NextResponse } from 'next/server';
import { db, getTursoClientIfAvailable } from '@/lib/db';
import { getSession } from '@/lib/session';

export async function GET() {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const tursoClient = getTursoClientIfAvailable();

    if (tursoClient) {
      // REF-009 + REF-005 + REF-026: Single optimized Turso query path
      // Returns user info, referral count, AND the list of referred users in one go

      // Query 1: User data + premium status (single row)
      const userRes = await tursoClient.execute({
        sql: `SELECT isPremium, referralCode, referredBy, premiumExpiresAt
             FROM User WHERE id = ?`,
        args: [user.id],
      });
      const u = userRes.rows[0] as any;

      // Query 2: Referred users list (with name, signup date, active status)
      const referredRes = await tursoClient.execute({
        sql: `SELECT name, createdAt, deactivated
             FROM User WHERE referredBy = ?
             ORDER BY createdAt DESC`,
        args: [u?.referralCode || user.referralCode],
      });

      const referredUsers = referredRes.rows.map((r: any) => ({
        name: r.name,
        createdAt: r.createdAt,
        isActive: !r.deactivated,
      }));

      return NextResponse.json({
        referralCode: u?.referralCode || user.referralCode,
        referralCount: referredUsers.length,
        isPremium: !!u?.isPremium,
        referredBy: u?.referredBy || null,
        referredUsers,
      });
    }

    // Prisma fallback (local dev)
    const fullUser = await db.user.findUnique({
      where: { id: user.id },
      select: { isPremium: true, referralCode: true, referredBy: true },
    });

    // Count + list in one query
    const referredUsersRaw = await db.user.findMany({
      where: { referredBy: fullUser?.referralCode || user.referralCode },
      select: { name: true, createdAt: true, deactivated: true },
      orderBy: { createdAt: 'desc' },
    });

    const referredUsers = referredUsersRaw.map((r: any) => ({
      name: r.name,
      createdAt: r.createdAt,
      isActive: !r.deactivated,
    }));

    return NextResponse.json({
      referralCode: fullUser?.referralCode || user.referralCode,
      referralCount: referredUsers.length,
      isPremium: !!(fullUser?.isPremium ?? user.isPremium),
      referredBy: fullUser?.referredBy || null,
      referredUsers,
    });
  } catch (error) {
    console.error('Referrals error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
