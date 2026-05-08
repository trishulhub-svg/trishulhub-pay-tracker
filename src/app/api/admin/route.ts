import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/session';

export async function GET() {
  try {
    const user = await getSession();
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Total signups
    const totalUsers = await db.user.count();

    // Users by plan
    const premiumUsers = await db.user.count({ where: { isPremium: true } });
    const freeUsers = totalUsers - premiumUsers;

    // Total companies tracked
    const totalCompanies = await db.company.count();

    // Total payment records
    const totalPaymentRecords = await db.paymentRecord.count();

    // Total shifts tracked
    const totalShifts = await db.shift.count();

    // Signups this month
    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const signupsThisMonth = await db.user.count({
      where: { createdAt: { gte: firstOfMonth } },
    });

    // Signups last month
    const firstOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const signupsLastMonth = await db.user.count({
      where: {
        createdAt: { gte: firstOfLastMonth, lt: firstOfMonth },
      },
    });

    // Total referral conversions
    const referralConversions = await db.user.count({
      where: { referredBy: { not: null } },
    });

    // Recent signups (last 10) - no personal data, just dates and plan type
    const recentSignupsRaw = await db.user.findMany({
      select: {
        createdAt: true,
        isPremium: true,
        referredBy: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    // Ensure boolean fields are properly converted
    const recentSignups = recentSignupsRaw.map((s: any) => ({
      createdAt: s.createdAt,
      isPremium: !!s.isPremium,
      referredBy: s.referredBy || null,
    }));

    // Monthly signups trend (last 6 months)
    const monthlySignups: Array<{ month: string; count: number }> = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const count = await db.user.count({
        where: { createdAt: { gte: monthStart, lt: monthEnd } },
      });
      monthlySignups.push({
        month: monthStart.toLocaleString('en-GB', { month: 'short', year: 'numeric' }),
        count,
      });
    }

    return NextResponse.json({
      stats: {
        totalUsers,
        premiumUsers,
        freeUsers,
        totalCompanies,
        totalPaymentRecords,
        totalShifts,
        signupsThisMonth,
        signupsLastMonth,
        referralConversions,
      },
      recentSignups,
      monthlySignups,
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
