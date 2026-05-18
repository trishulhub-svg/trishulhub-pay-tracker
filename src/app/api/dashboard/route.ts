import { NextRequest, NextResponse } from 'next/server';
import { db, getTursoClientIfAvailable } from '@/lib/db';
import { getSession } from '@/lib/session';

export async function GET(request: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');

    // DASH-002: Validate companyId belongs to the authenticated user
    if (companyId) {
      const company = await db.company.findUnique({ where: { id: companyId } });
      if (!company || company.userId !== user.id) {
        return NextResponse.json({ error: 'Invalid company filter' }, { status: 400 });
      }
    }

    // Current month boundaries
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const currentMonthStart = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
    const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;
    const nextMonthYear = currentMonth === 12 ? currentYear + 1 : currentYear;
    const currentMonthEnd = `${nextMonthYear}-${String(nextMonth).padStart(2, '0')}-01`;
    const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;

    // Simple queries via ORM (parallel)
    const [companies, referralCount, currentMonthShifts] = await Promise.all([
      db.company.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
      }),
      db.user.count({
        where: { referredBy: user.referralCode },
      }),
      db.shift.findMany({
        where: {
          userId: user.id,
          date: { gte: currentMonthStart, lt: currentMonthEnd },
        },
        orderBy: { date: 'desc' },
      }),
    ]);

    const tursoClient = getTursoClientIfAvailable();

    if (tursoClient) {
      // ============================================================
      // TURSO PATH: Raw SQL aggregates — O(1) instead of O(all records)
      // DASH-001: SQL totals instead of loading every record
      // DASH-005: LIMIT 5 for recent records
      // DASH-008: GROUP BY for company stats instead of O(n*m) filtering
      // ============================================================
      const companyFilter = companyId ? ' AND pr.companyId = ?' : '';
      const companyArgs = companyId ? [companyId] : [];

      // 1. Overall totals — single aggregate query (was: load ALL records + JS reduce)
      const [totalsRes, recentRes, compRes, companyStatsRes] = await Promise.all([
        tursoClient.execute({
          sql: `SELECT
            COUNT(*) as totalRecords,
            SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) as pendingCount,
            SUM(CASE WHEN status = 'PAID' THEN 1 ELSE 0 END) as paidCount,
            COALESCE(SUM(totalExpected), 0) as totalExpected,
            COALESCE(SUM(totalReceived), 0) as totalReceived,
            COALESCE(SUM(totalHMRC), 0) as totalHMRC,
            COALESCE(SUM(totalDue), 0) as totalDue,
            COALESCE(SUM(workedHours), 0) as workedHours
          FROM PaymentRecord pr WHERE pr.userId = ?${companyFilter}`,
          args: [user.id, ...companyArgs],
        }),
        // 2. Recent 5 records (was 10, only 5 shown in UI — DASH-005)
        tursoClient.execute({
          sql: `SELECT pr.*, c.name as "companyName", c.id as "companyId2"
            FROM PaymentRecord pr
            JOIN Company c ON pr.companyId = c.id
            WHERE pr.userId = ?${companyFilter}
            ORDER BY pr.year DESC, pr.month DESC
            LIMIT 5`,
          args: [user.id, ...companyArgs],
        }),
        // 3. DASH-010: Aggregated totals for current + previous month comparison
        // (was: fetch ALL rows + .find() first match — wrong for multi-company users)
        tursoClient.execute({
          sql: `SELECT
            pr.month, pr.year,
            COALESCE(SUM(pr.totalExpected), 0) as totalExpected,
            COALESCE(SUM(pr.totalReceived), 0) as totalReceived,
            COALESCE(SUM(pr.totalHMRC), 0) as totalHMRC,
            COALESCE(SUM(pr.totalDue), 0) as totalDue,
            COALESCE(SUM(pr.workedHours), 0) as workedHours,
            COUNT(*) as recordCount
          FROM PaymentRecord pr
          WHERE pr.userId = ?
            AND ((pr.month = ? AND pr.year = ?) OR (pr.month = ? AND pr.year = ?))${companyFilter}
          GROUP BY pr.month, pr.year
          ORDER BY pr.year DESC, pr.month DESC`,
          args: [user.id, currentMonth, currentYear, prevMonth, prevYear, ...companyArgs],
        }),
        // 4. Per-company stats via GROUP BY (was O(n*m) JS filtering — DASH-008)
        tursoClient.execute({
          sql: `SELECT
            pr.companyId as id,
            MAX(c.name) as name,
            COUNT(*) as recordCount,
            COALESCE(SUM(pr.totalExpected), 0) as totalExpected,
            COALESCE(SUM(pr.totalReceived), 0) as totalReceived,
            COALESCE(SUM(pr.totalHMRC), 0) as totalHMRC,
            COALESCE(SUM(pr.totalDue), 0) as totalDue,
            (
              SELECT pr2.status FROM PaymentRecord pr2
              WHERE pr2.companyId = pr.companyId
                AND pr2.userId = ?
              ORDER BY pr2.year DESC, pr2.month DESC
              LIMIT 1
            ) as latestStatus
          FROM PaymentRecord pr
          JOIN Company c ON pr.companyId = c.id
          WHERE pr.userId = ?${companyFilter}
          GROUP BY pr.companyId`,
          args: [user.id, user.id, ...companyArgs],
        }),
      ]);

      // Parse totals
      const t = totalsRes.rows[0];
      const stats = {
        totalRecords: Number(t.totalRecords),
        pendingCount: Number(t.pendingCount),
        paidCount: Number(t.paidCount),
        totalExpected: Number(t.totalExpected),
        totalReceived: Number(t.totalReceived),
        totalHMRC: Number(t.totalHMRC),
        totalDue: Number(t.totalDue),
        workedHours: Number(t.workedHours),
      };

      // Parse recent records
      const recentRecords = recentRes.rows.map((row: any) => ({
        id: row.id,
        month: Number(row.month),
        year: Number(row.year),
        totalExpected: Number(row.totalExpected || 0),
        totalReceived: Number(row.totalReceived || 0),
        totalHMRC: Number(row.totalHMRC || 0),
        totalDue: Number(row.totalDue || 0),
        workedHours: Number(row.workedHours || 0),
        status: row.status,
        companyId: row.companyId,
        company: { id: row.companyId, name: row.companyName },
      }));

      // DASH-010: Parse aggregated comparison rows (one per month)
      const compRows = compRes.rows.map((row: any) => ({
        month: Number(row.month),
        year: Number(row.year),
        totalExpected: Number(row.totalExpected || 0),
        totalReceived: Number(row.totalReceived || 0),
        totalHMRC: Number(row.totalHMRC || 0),
        totalDue: Number(row.totalDue || 0),
        workedHours: Number(row.workedHours || 0),
        recordCount: Number(row.recordCount || 0),
      }));
      const comparison = {
        current: compRows.find((r: any) => r.month === currentMonth && r.year === currentYear) || null,
        previous: compRows.find((r: any) => r.month === prevMonth && r.year === prevYear) || null,
      };

      // Parse company stats
      const companyStats = companyStatsRes.rows.map((row: any) => ({
        id: row.id,
        name: row.name,
        recordCount: Number(row.recordCount),
        totals: {
          totalExpected: Number(row.totalExpected),
          totalReceived: Number(row.totalReceived),
          totalHMRC: Number(row.totalHMRC),
          totalDue: Number(row.totalDue),
        },
        latestStatus: row.latestStatus || null,
      }));

      // Companies with count for dropdown
      const companiesWithCount = companies.map((c: any) => {
        const cs = companyStats.find(s => s.id === c.id);
        return { ...c, _count: { paymentRecords: cs?.recordCount || 0 } };
      });

      return NextResponse.json({
        stats,
        companies: companiesWithCount,
        companyStats,
        recentRecords,
        comparison,
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

    } else {
      // ============================================================
      // PRISMA PATH (local dev): Fallback using ORM
      // ============================================================
      const whereClause = companyId ? { userId: user.id, companyId } : { userId: user.id };

      const allRecords = await db.paymentRecord.findMany({
        where: whereClause,
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
      });

      const stats = allRecords.reduce(
        (acc, r, i) => ({
          totalRecords: i + 1,
          pendingCount: acc.pendingCount + (r.status === 'PENDING' ? 1 : 0),
          paidCount: acc.paidCount + (r.status === 'PAID' ? 1 : 0),
          totalExpected: acc.totalExpected + Number(r.totalExpected || 0),
          totalReceived: acc.totalReceived + Number(r.totalReceived || 0),
          totalHMRC: acc.totalHMRC + Number(r.totalHMRC || 0),
          totalDue: acc.totalDue + Number(r.totalDue || 0),
          workedHours: acc.workedHours + Number(r.workedHours || 0),
        }),
        { totalRecords: 0, pendingCount: 0, paidCount: 0, totalExpected: 0, totalReceived: 0, totalHMRC: 0, totalDue: 0, workedHours: 0 }
      );

      const recentRecords = allRecords.slice(0, 5);

      // DASH-010: Aggregate comparison by month (was: .find() returns first row only)
      const currentRecords = allRecords.filter((r: any) => Number(r.month) === currentMonth && Number(r.year) === currentYear);
      const previousRecords = allRecords.filter((r: any) => Number(r.month) === prevMonth && Number(r.year) === prevYear);
      const aggregateRecords = (recs: any[]) => ({
        totalExpected: recs.reduce((s: number, r: any) => s + Number(r.totalExpected || 0), 0),
        totalReceived: recs.reduce((s: number, r: any) => s + Number(r.totalReceived || 0), 0),
        totalHMRC: recs.reduce((s: number, r: any) => s + Number(r.totalHMRC || 0), 0),
        totalDue: recs.reduce((s: number, r: any) => s + Number(r.totalDue || 0), 0),
        workedHours: recs.reduce((s: number, r: any) => s + Number(r.workedHours || 0), 0),
        recordCount: recs.length,
      });
      const comparison = {
        current: currentRecords.length > 0 ? { month: currentMonth, year: currentYear, ...aggregateRecords(currentRecords) } : null,
        previous: previousRecords.length > 0 ? { month: prevMonth, year: prevYear, ...aggregateRecords(previousRecords) } : null,
      };

      // Single-pass company stats map (was O(n*m) — DASH-008)
      const companyMap = new Map<string, any[]>();
      for (const r of allRecords) {
        if (!companyMap.has(r.companyId)) companyMap.set(r.companyId, []);
        companyMap.get(r.companyId)!.push(r);
      }
      const companyStats = companies.map((c: any) => {
        const cRecords = companyMap.get(c.id) || [];
        return {
          id: c.id,
          name: c.name,
          recordCount: cRecords.length,
          totals: cRecords.reduce(
            (acc, r) => ({
              totalExpected: acc.totalExpected + Number(r.totalExpected || 0),
              totalReceived: acc.totalReceived + Number(r.totalReceived || 0),
              totalHMRC: acc.totalHMRC + Number(r.totalHMRC || 0),
              totalDue: acc.totalDue + Number(r.totalDue || 0),
            }),
            { totalExpected: 0, totalReceived: 0, totalHMRC: 0, totalDue: 0 }
          ),
          latestStatus: cRecords[0]?.status || null,
        };
      });

      const companiesWithCount = companies.map((c: any) => {
        const cs = companyStats.find((s: any) => s.id === c.id);
        return { ...c, _count: { paymentRecords: cs?.recordCount || 0 } };
      });

      return NextResponse.json({
        stats,
        companies: companiesWithCount,
        companyStats,
        recentRecords,
        comparison,
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
    }
  } catch (error) {
    console.error('Dashboard error:', error);
    const msg = error instanceof Error ? error.message : String(error);
    // Don't leak internal details in production, but include enough to debug
    return NextResponse.json({ error: `Dashboard error: ${msg}` }, { status: 500 });
  }
}
