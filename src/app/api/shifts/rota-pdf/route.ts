import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/session';

// GET /api/shifts/rota-pdf?month=1&year=2025&from=2025-01-01&to=2025-01-31
export async function GET(request: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');
    const year = searchParams.get('year');
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    let startDate: string;
    let endDate: string;
    let monthLabel: string;

    const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];

    if (from && to) {
      // Premium user: custom date range
      startDate = from;
      endDate = to;
      monthLabel = `${from} to ${to}`;
    } else if (month && year) {
      const m = parseInt(month);
      const y = parseInt(year);
      startDate = `${y}-${String(m).padStart(2, '0')}-01`;
      const nextMonth = m === 12 ? 1 : m + 1;
      const nextYear = m === 12 ? y + 1 : y;
      endDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;
      monthLabel = `${MONTHS[m - 1]} ${y}`;

      // Free user download window check: only from last day of month to next month 5th
      if (!user.isPremium) {
        const now = new Date();
        const lastDayOfMonth = new Date(y, m, 0); // last day of the target month
        const windowStart = new Date(lastDayOfMonth);
        windowStart.setHours(0, 0, 0, 0);

        const windowEnd = new Date(nextYear, nextMonth - 1, 6); // 6th of next month (exclusive)
        windowEnd.setHours(0, 0, 0, 0);

        if (now < windowStart || now >= windowEnd) {
          return NextResponse.json({
            error: 'Free users can only download monthly rota from the last day of the month until the 5th of the next month. Upgrade to Premium for unlimited downloads!',
            windowStart: windowStart.toISOString(),
            windowEnd: windowEnd.toISOString(),
          }, { status: 403 });
        }
      }
    } else {
      return NextResponse.json({ error: 'Provide month/year or from/to date range' }, { status: 400 });
    }

    // Fetch shifts for the period
    const where: any = { userId: user.id, date: { gte: startDate, lt: endDate } };
    const shifts = await db.shift.findMany({
      where,
      include: { company: { select: { id: true, name: true } } },
      orderBy: { date: 'asc' },
    });

    // Fetch companies for pay rate info
    const companies = await db.company.findMany({
      where: { userId: user.id },
    });
    const companyMap = new Map(companies.map((c: any) => [c.id, c]));

    // Group shifts by date
    const shiftsByDate = new Map<string, any[]>();
    for (const shift of shifts) {
      const dateStr = shift.date;
      if (!shiftsByDate.has(dateStr)) {
        shiftsByDate.set(dateStr, []);
      }
      shiftsByDate.get(dateStr)!.push(shift);
    }

    // Calculate totals
    let totalHours = 0;
    let totalEarnings = 0;
    const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    // Generate HTML for PDF
    const rows: string[] = [];
    const sortedDates = [...shiftsByDate.keys()].sort();

    for (const dateStr of sortedDates) {
      const dayShifts = shiftsByDate.get(dateStr)!;
      const d = new Date(dateStr + 'T00:00:00');
      const dayName = DAY_NAMES[d.getDay()];

      for (const s of dayShifts) {
        const rate = s.payRate || companyMap.get(s.companyId)?.payRate || 0;
        const earnings = s.totalHours * rate;
        totalHours += s.totalHours;
        totalEarnings += earnings;

        rows.push(`
          <tr>
            <td style="padding:8px;border:1px solid #ddd;">${dayName} ${dateStr}</td>
            <td style="padding:8px;border:1px solid #ddd;">${s.company.name}</td>
            <td style="padding:8px;border:1px solid #ddd;">${s.startTime} - ${s.endTime}</td>
            <td style="padding:8px;border:1px solid #ddd;">${s.totalHours}h</td>
            <td style="padding:8px;border:1px solid #ddd;">${s.breakMinutes}m</td>
            <td style="padding:8px;border:1px solid #ddd;">${s.shiftType}</td>
            <td style="padding:8px;border:1px solid #ddd;">&pound;${rate.toFixed(2)}</td>
            <td style="padding:8px;border:1px solid #ddd;">&pound;${earnings.toFixed(2)}</td>
          </tr>
        `);
      }
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Shift Rota - ${monthLabel}</title>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; margin: 20px; color: #1a1a2e; }
          .header { text-align: center; margin-bottom: 24px; border-bottom: 3px solid #2563eb; padding-bottom: 16px; }
          .header h1 { margin: 0; font-size: 22px; color: #2563eb; }
          .header p { margin: 4px 0; color: #666; font-size: 13px; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 12px; }
          th { background: #2563eb; color: white; padding: 10px 8px; text-align: left; border: 1px solid #1d4ed8; }
          tr:nth-child(even) { background: #f0f4ff; }
          .totals { margin-top: 20px; padding: 16px; background: #f0f4ff; border-radius: 8px; display: flex; justify-content: space-around; }
          .totals .stat { text-align: center; }
          .totals .stat .value { font-size: 20px; font-weight: bold; color: #2563eb; }
          .totals .stat .label { font-size: 11px; color: #666; }
          .footer { margin-top: 24px; text-align: center; font-size: 10px; color: #999; border-top: 1px solid #eee; padding-top: 8px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>TrishulHub Pay Tracker</h1>
          <p>Monthly Shift Rota: ${monthLabel}</p>
          <p>Generated: ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>

        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Company</th>
              <th>Time</th>
              <th>Hours</th>
              <th>Break</th>
              <th>Type</th>
              <th>Rate</th>
              <th>Earnings</th>
            </tr>
          </thead>
          <tbody>
            ${rows.length > 0 ? rows.join('') : '<tr><td colspan="8" style="text-align:center;padding:20px;">No shifts found for this period</td></tr>'}
          </tbody>
        </table>

        <div class="totals">
          <div class="stat">
            <div class="value">${totalHours.toFixed(1)}h</div>
            <div class="label">Total Hours</div>
          </div>
          <div class="stat">
            <div class="value">${shifts.length}</div>
            <div class="label">Total Shifts</div>
          </div>
          <div class="stat">
            <div class="value">&pound;${totalEarnings.toFixed(2)}</div>
            <div class="label">Total Earnings</div>
          </div>
        </div>

        <div class="footer">
          TrishulHub Pay Tracker &mdash; Track your salary payments, free forever
        </div>
      </body>
      </html>
    `;

    // Return HTML that the client will convert to PDF
    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html',
        'X-Period-Label': monthLabel,
        'X-Total-Hours': totalHours.toFixed(1),
        'X-Total-Earnings': totalEarnings.toFixed(2),
      },
    });
  } catch (error) {
    console.error('Rota PDF error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
