import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/session';

export async function GET(request: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');

    // Get user's companies with payment record counts
    const companies = await db.company.findMany({
      where: { userId: user.id },
      include: {
        _count: { select: { paymentRecords: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Get records for selected company or all
    const where: Record<string, unknown> = { userId: user.id };
    if (companyId) where.companyId = companyId;

    const records = await db.paymentRecord.findMany({
      where,
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });

    // Calculate totals
    const totals = records.reduce(
      (acc, r) => ({
        totalExpected: acc.totalExpected + Number(r.totalExpected || 0),
        totalReceived: acc.totalReceived + Number(r.totalReceived || 0),
        totalHMRC: acc.totalHMRC + Number(r.totalHMRC || 0),
        totalDue: acc.totalDue + Number(r.totalDue || 0),
        workedHours: acc.workedHours + Number(r.workedHours || 0),
      }),
      { totalExpected: 0, totalReceived: 0, totalHMRC: 0, totalDue: 0, workedHours: 0 }
    );

    const pendingCount = records.filter((r) => r.status === 'PENDING').length;
    const paidCount = records.filter((r) => r.status === 'PAID').length;
    const recentRecords = records.slice(0, 10);

    // Current month vs previous
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const currentMonthRecord = records.find(
      (r) => Number(r.month) === currentMonth && Number(r.year) === currentYear
    );
    const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;
    const prevMonthRecord = records.find(
      (r) => Number(r.month) === prevMonth && Number(r.year) === prevYear
    );

    // Get referral info
    const referralCount = await db.user.count({
      where: { referredBy: user.referralCode },
    });

    // Get shift summary for current month
    const currentMonthStart = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
    const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;
    const nextMonthYear = currentMonth === 12 ? currentYear + 1 : currentYear;
    const currentMonthEnd = `${nextMonthYear}-${String(nextMonth).padStart(2, '0')}-01`;

    const currentMonthShifts = await db.shift.findMany({
      where: {
        userId: user.id,
        date: { gte: currentMonthStart, lt: currentMonthEnd },
      },
    });

    const shiftSummary = currentMonthShifts.reduce(
      (acc, s) => ({
        totalHours: acc.totalHours + Number(s.totalHours || 0),
        totalShifts: acc.totalShifts + 1,
        totalBreakMinutes: acc.totalBreakMinutes + Number(s.breakMinutes || 0),
      }),
      { totalHours: 0, totalShifts: 0, totalBreakMinutes: 0 }
    );

    // Stats per company
    const companyStats = companies.map((c: any) => {
      const companyRecords = records.filter((r) => r.companyId === c.id);
      const companyTotals = companyRecords.reduce(
        (acc, r) => ({
          totalExpected: acc.totalExpected + Number(r.totalExpected || 0),
          totalReceived: acc.totalReceived + Number(r.totalReceived || 0),
          totalHMRC: acc.totalHMRC + Number(r.totalHMRC || 0),
          totalDue: acc.totalDue + Number(r.totalDue || 0),
        }),
        { totalExpected: 0, totalReceived: 0, totalHMRC: 0, totalDue: 0 }
      );
      const latestRecord = companyRecords[0] || null;
      return {
        id: c.id,
        name: c.name,
        recordCount: c._count?.paymentRecords ?? companyRecords.length,
        totals: companyTotals,
        latestStatus: latestRecord?.status || null,
      };
    });

    return NextResponse.json({
      stats: {
        totalRecords: records.length,
        pendingCount,
        paidCount,
        ...totals,
      },
      companies,
      companyStats,
      recentRecords,
      comparison: {
        current: currentMonthRecord || null,
        previous: prevMonthRecord || null,
      },
      referralInfo: {
        referralCode: user.referralCode,
        referralCount,
        isPremium: user.isPremium,
      },
      shiftSummary: {
        ...shiftSummary,
        month: currentMonth,
        year: currentYear,
      },
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
