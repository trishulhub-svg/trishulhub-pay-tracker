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

    // Current month boundaries (needed for multiple queries)
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const currentMonthStart = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
    const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;
    const nextMonthYear = currentMonth === 12 ? currentYear + 1 : currentYear;
    const currentMonthEnd = `${nextMonthYear}-${String(nextMonth).padStart(2, '0')}-01`;

    // Run all independent queries in parallel (was 4 sequential awaits)
    const [companies, records, referralCount, currentMonthShifts] = await Promise.all([
      db.company.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
      }),
      db.paymentRecord.findMany({
        where: companyId ? { userId: user.id, companyId } : { userId: user.id },
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
      }),
      db.user.count({
        where: { referredBy: user.referralCode },
      }),
      db.shift.findMany({
        where: {
          userId: user.id,
          date: { gte: currentMonthStart, lt: currentMonthEnd },
        },
      }),
    ]);

    // Populate _count for companies from records (avoids N+1 queries)
    const recordCountByCompany = new Map<string, number>();
    for (const r of records) {
      recordCountByCompany.set(r.companyId, (recordCountByCompany.get(r.companyId) || 0) + 1);
    }
    const companiesWithCount = companies.map((c: any) => ({
      ...c,
      _count: { paymentRecords: recordCountByCompany.get(c.id) || 0 },
    }));

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
    const currentMonthRecord = records.find(
      (r) => Number(r.month) === currentMonth && Number(r.year) === currentYear
    );
    const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;
    const prevMonthRecord = records.find(
      (r) => Number(r.month) === prevMonth && Number(r.year) === prevYear
    );

    // Stats per company
    const companyStats = companiesWithCount.map((c: any) => {
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
      companies: companiesWithCount,
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
        totalHours: currentMonthShifts.reduce((acc, s) => acc + Number(s.totalHours || 0), 0),
        totalShifts: currentMonthShifts.length,
        totalBreakMinutes: currentMonthShifts.reduce((acc, s) => acc + Number(s.breakMinutes || 0), 0),
        month: currentMonth,
        year: currentYear,
      },
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
