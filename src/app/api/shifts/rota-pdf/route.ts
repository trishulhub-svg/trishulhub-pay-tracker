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

    let useLte = false; // Whether to use <= (inclusive) for endDate
    if (from && to) {
      // Premium user: custom date range — end date is inclusive
      startDate = from;
      endDate = to;
      useLte = true;
      monthLabel = `${from} to ${to}`;
    } else if (month && year) {
      const m = parseInt(month);
      const y = parseInt(year);
      startDate = `${y}-${String(m).padStart(2, '0')}-01`;
      const nextMonth = m === 12 ? 1 : m + 1;
      const nextYear = m === 12 ? y + 1 : y;
      endDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;
      monthLabel = `${MONTHS[m - 1]} ${y}`;

      // Free user download window check
      if (!user.isPremium) {
        const now = new Date();
        const lastDayOfMonth = new Date(y, m, 0);
        const windowStart = new Date(lastDayOfMonth);
        windowStart.setHours(0, 0, 0, 0);

        const windowEnd = new Date(nextYear, nextMonth - 1, 6);
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
    const dateFilter: any = { gte: startDate };
    if (useLte) {
      dateFilter.lte = endDate;
    } else {
      dateFilter.lt = endDate;
    }
    const where: any = { userId: user.id, date: dateFilter };
    const shifts = await db.shift.findMany({
      where,
      include: { company: { select: { id: true, name: true } } },
      orderBy: { date: 'asc' },
    });

    // Fetch companies for pay rate info
    const companies = await db.company.findMany({
      where: { userId: user.id },
    });
    const companyMap = new Map<string, any>(companies.map((c: any) => [c.id, c]));

    // Fetch pay rate history for all user's companies
    const rateHistoryMap = new Map<string, any[]>();
    for (const c of companies) {
      try {
        const history = await db.payRateHistory.findMany({
          where: { companyId: c.id },
          orderBy: { effectiveFrom: 'desc' },
        });
        rateHistoryMap.set(c.id, history);
      } catch { /* ignore */ }
    }

    // Helper to get effective pay rate for a company on a specific date
    function getEffectiveRate(companyId: string, date: string, shiftRate: number): number {
      if (shiftRate && shiftRate > 0) return shiftRate;
      const history = rateHistoryMap.get(companyId) || [];
      const effectiveRate = history.find((r: any) => r.effectiveFrom <= date);
      if (effectiveRate) return effectiveRate.payRate;
      return companyMap.get(companyId)?.payRate || 0;
    }

    // Group shifts by company first, then by date within each company
    const shiftsByCompany = new Map<string, Map<string, any[]>>();
    const allDatesSet = new Set<string>();
    for (const shift of shifts) {
      const companyName = shift.company?.name || 'Unknown';
      const dateStr = shift.date;
      allDatesSet.add(dateStr);
      if (!shiftsByCompany.has(companyName)) {
        shiftsByCompany.set(companyName, new Map());
      }
      const companyDates = shiftsByCompany.get(companyName)!;
      if (!companyDates.has(dateStr)) {
        companyDates.set(dateStr, []);
      }
      companyDates.get(dateStr)!.push(shift);
    }

    // Calculate totals
    let totalHours = 0;
    let totalEarnings = 0;
    const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    // Build company sections — each company gets its own table with company name as heading
    const companySections: string[] = [];
    const sortedCompanyNames = [...shiftsByCompany.keys()].sort();

    for (const companyName of sortedCompanyNames) {
      const companyDates = shiftsByCompany.get(companyName)!;
      const sortedDates = [...companyDates.keys()].sort();

      const rows: string[] = [];
      let companyHours = 0;
      let companyEarnings = 0;

      for (const dateStr of sortedDates) {
        const dayShifts = companyDates.get(dateStr)!;
        const d = new Date(dateStr + 'T00:00:00');
        const dayName = DAY_NAMES[d.getDay()];

        for (let i = 0; i < dayShifts.length; i++) {
          const s = dayShifts[i];
          const rate = getEffectiveRate(s.companyId, dateStr, s.payRate);
          const earnings = s.totalHours * rate;
          totalHours += s.totalHours;
          totalEarnings += earnings;
          companyHours += s.totalHours;
          companyEarnings += earnings;

          const isFirstInGroup = i === 0;
          const dateCell = isFirstInGroup
            ? `<td class="date-cell" rowspan="${dayShifts.length}">${dayName}<br>${formatDate(dateStr)}</td>`
            : '';

          const clientCell = s.client ? `<td class="client-cell">${escapeHtml(s.client)}</td>` : '<td class="client-cell">–</td>';
          const notesCell = s.notes ? `<td class="notes-cell">${escapeHtml(s.notes)}</td>` : '<td class="notes-cell">–</td>';

          rows.push(`
            <tr class="shift-row">
              ${dateCell}
              <td>${escapeHtml(s.startTime)} – ${escapeHtml(s.endTime)}</td>
              <td class="num">${s.totalHours.toFixed(1)}h</td>
              <td class="num">${s.breakMinutes}m</td>
              <td>${escapeHtml(s.shiftType)}</td>
              ${clientCell}
              ${notesCell}
              <td class="num">&pound;${rate.toFixed(2)}</td>
              <td class="num earnings">&pound;${earnings.toFixed(2)}</td>
            </tr>
          `);
        }
      }

      companySections.push(`
        <div class="company-section">
          <div class="company-header">
            <span class="company-name">${escapeHtml(companyName)}</span>
            <span class="company-stats">${companyHours.toFixed(1)}h &bull; &pound;${companyEarnings.toFixed(2)}</span>
          </div>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Time</th>
                <th class="num">Hours</th>
                <th class="num">Break</th>
                <th>Type</th>
                <th>Client</th>
                <th>Notes</th>
                <th class="num">Rate</th>
                <th class="num">Earnings</th>
              </tr>
            </thead>
            <tbody>
              ${rows.join('')}
            </tbody>
          </table>
        </div>
      `);
    }

    // Build weekly summary
    const shiftsByDate = new Map<string, any[]>();
    for (const shift of shifts) {
      const dateStr = shift.date;
      if (!shiftsByDate.has(dateStr)) {
        shiftsByDate.set(dateStr, []);
      }
      shiftsByDate.get(dateStr)!.push(shift);
    }
    const sortedDates = [...shiftsByDate.keys()].sort();
    const weeklySummary = buildWeeklySummary(shiftsByDate, sortedDates, companyMap, rateHistoryMap);

    const userName = escapeHtml(user.name || user.email.split('@')[0]);
    const generatedDate = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    const generatedTime = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Shift Rota – ${escapeHtml(monthLabel)}</title>
  <style>
    /* ===== BASE STYLES ===== */
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      color: #1a1a2e;
      background: #fff;
      line-height: 1.5;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    /* ===== WATERMARK ===== */
    .watermark {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-45deg);
      font-size: 72px;
      font-weight: 800;
      color: rgba(37, 99, 235, 0.03);
      pointer-events: none;
      z-index: 0;
      white-space: nowrap;
      letter-spacing: 12px;
    }

    /* ===== PAGE LAYOUT ===== */
    .page-container {
      position: relative;
      z-index: 1;
      padding: 32px 40px;
      max-width: 1200px;
      margin: 0 auto;
    }

    /* ===== HEADER ===== */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 3px solid #2563eb;
    }
    .header-left h1 {
      font-size: 22px;
      font-weight: 700;
      color: #2563eb;
      margin-bottom: 2px;
    }
    .header-left .subtitle {
      font-size: 13px;
      color: #64748b;
      margin-bottom: 6px;
    }
    .header-left .period-badge {
      display: inline-block;
      background: #eff6ff;
      color: #2563eb;
      font-size: 12px;
      font-weight: 600;
      padding: 3px 10px;
      border-radius: 12px;
      border: 1px solid #bfdbfe;
    }
    .header-right {
      text-align: right;
      font-size: 12px;
      color: #64748b;
    }
    .header-right .user-name {
      font-size: 15px;
      font-weight: 600;
      color: #1e293b;
      margin-bottom: 2px;
    }

    /* ===== SUMMARY CARDS ===== */
    .summary-cards {
      display: flex;
      gap: 12px;
      margin-bottom: 24px;
    }
    .summary-card {
      flex: 1;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 12px 14px;
      text-align: center;
    }
    .summary-card .value {
      font-size: 20px;
      font-weight: 700;
      color: #2563eb;
    }
    .summary-card .label {
      font-size: 10px;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-top: 2px;
    }

    /* ===== COMPANY SECTION ===== */
    .company-section {
      margin-bottom: 20px;
    }
    .company-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 12px;
      background: linear-gradient(135deg, #2563eb, #1d4ed8);
      border-radius: 8px 8px 0 0;
      color: #fff;
    }
    .company-header .company-name {
      font-size: 14px;
      font-weight: 700;
      letter-spacing: 0.3px;
    }
    .company-header .company-stats {
      font-size: 12px;
      opacity: 0.9;
      font-weight: 500;
    }

    /* ===== TABLE ===== */
    .table-title {
      font-size: 14px;
      font-weight: 600;
      color: #334155;
      margin-bottom: 8px;
      padding-left: 2px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11px;
      margin-bottom: 0;
    }

    thead th {
      background: #f1f5f9;
      color: #334155;
      padding: 8px 6px;
      text-align: left;
      font-weight: 600;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      border: 1px solid #e2e8f0;
      position: sticky;
      top: 0;
    }
    thead th.num { text-align: right; }

    tbody td {
      padding: 6px 6px;
      border: 1px solid #e2e8f0;
      vertical-align: middle;
      font-size: 11px;
    }
    tbody td.num { text-align: right; font-variant-numeric: tabular-nums; }
    tbody td.earnings { font-weight: 600; color: #059669; }
    tbody td.client-cell { color: #6366f1; font-weight: 500; max-width: 100px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    tbody td.notes-cell { color: #64748b; max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-style: italic; }

    tbody .date-cell {
      font-weight: 600;
      background: #f8fafc;
      color: #334155;
      text-align: center;
      line-height: 1.35;
    }

    .company-section table { border-radius: 0 0 8px 8px; overflow: hidden; }
    .company-section table thead th { border-bottom: 2px solid #2563eb; }

    tbody tr.shift-row:nth-child(even) td { background: #f8fafc; }
    tbody tr.shift-row:hover td { background: #eff6ff; }

    .no-shifts {
      text-align: center;
      padding: 40px 20px;
      color: #94a3b8;
      font-size: 14px;
    }

    /* ===== WEEKLY SUMMARY ===== */
    .weekly-section { margin-bottom: 24px; margin-top: 8px; }
    .weekly-section .table-title { margin-top: 8px; }
    .weekly-table {
      font-size: 12px;
    }
    .weekly-table td, .weekly-table th {
      padding: 6px 8px;
    }

    /* ===== FOOTER ===== */
    .footer {
      margin-top: 24px;
      padding-top: 12px;
      border-top: 2px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 10px;
      color: #94a3b8;
    }
    .footer .brand {
      font-weight: 600;
      color: #64748b;
    }

    /* ===== PRINT-SPECIFIC OVERRIDES ===== */
    @media print {
      @page {
        size: A4 landscape;
        margin: 12mm 10mm;
      }

      body {
        background: #fff !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }

      .page-container {
        padding: 0;
        max-width: none;
      }

      .watermark {
        display: block;
        color: rgba(37, 99, 235, 0.04);
      }

      .header,
      .summary-cards {
        break-after: avoid;
        break-inside: avoid;
      }

      .company-section {
        break-inside: avoid;
      }

      tbody tr.shift-row {
        break-inside: avoid;
      }

      .table-title {
        break-after: avoid;
      }

      .weekly-section {
        break-inside: auto;
      }

      .footer {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        padding: 6mm 10mm;
        border-top: 1px solid #cbd5e1;
        margin: 0;
      }

      tbody tr.shift-row:hover td { background: inherit; }

      thead { display: table-header-group; }
      tfoot { display: table-footer-group; }

      table { width: 100%; }
    }

    /* ===== SCREEN-ONLY (hidden during print) ===== */
    @media print {
      .screen-only { display: none !important; }
    }
    .screen-only {
      margin-top: 20px;
      text-align: center;
    }
    .print-btn {
      background: #2563eb;
      color: #fff;
      border: none;
      padding: 10px 28px;
      font-size: 14px;
      font-weight: 600;
      border-radius: 6px;
      cursor: pointer;
    }
    .print-btn:hover { background: #1d4ed8; }
  </style>
</head>
<body>

<div class="watermark">TrishulHub</div>

<div class="page-container">

  <!-- HEADER -->
  <div class="header">
    <div class="header-left">
      <h1>TrishulHub Pay Tracker</h1>
      <div class="subtitle">Shift Rota</div>
      <span class="period-badge">${escapeHtml(monthLabel)}</span>
    </div>
    <div class="header-right">
      <div class="user-name">${userName}</div>
      <div>Generated: ${generatedDate} at ${generatedTime}</div>
      ${user.isPremium ? '<div style="color:#2563eb;font-weight:600;">&#9733; Premium</div>' : ''}
    </div>
  </div>

  <!-- SUMMARY CARDS -->
  <div class="summary-cards">
    <div class="summary-card">
      <div class="value">${totalHours.toFixed(1)}h</div>
      <div class="label">Total Hours</div>
    </div>
    <div class="summary-card">
      <div class="value">${shifts.length}</div>
      <div class="label">Total Shifts</div>
    </div>
    <div class="summary-card">
      <div class="value">&pound;${totalEarnings.toFixed(2)}</div>
      <div class="label">Total Earnings</div>
    </div>
    <div class="summary-card">
      <div class="value">${sortedDates.length}</div>
      <div class="label">Working Days</div>
    </div>
    <div class="summary-card">
      <div class="value">&pound;${sortedDates.length > 0 ? (totalEarnings / sortedDates.length).toFixed(2) : '0.00'}</div>
      <div class="label">Avg / Day</div>
    </div>
  </div>

  <!-- COMPANY SECTIONS (each company has its own table with company name as header) -->
  ${companySections.length > 0 ? companySections.join('') : `
    <div class="no-shifts">No shifts found for this period</div>
  `}

  <!-- WEEKLY SUMMARY -->
  ${weeklySummary}

  <!-- FOOTER -->
  <div class="footer">
    <div>
      <span class="brand">TrishulHub Pay Tracker</span> &mdash; Track your salary payments, free forever
    </div>
    <div>
      ${escapeHtml(monthLabel)} &bull; ${userName}
    </div>
  </div>

</div>

<!-- Print button (screen only) -->
<div class="screen-only">
  <button class="print-btn" onclick="window.print()">Print / Save as PDF</button>
</div>

</body>
</html>`;

    // Return HTML that the client will print
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

// ===== HELPER FUNCTIONS =====

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

function buildWeeklySummary(
  shiftsByDate: Map<string, any[]>,
  sortedDates: string[],
  companyMap: Map<string, any>,
  rateHistoryMap: Map<string, any[]>,
): string {
  if (sortedDates.length === 0) return '';

  const weekMap = new Map<string, { hours: number; earnings: number; shifts: number; days: Set<string> }>();

  for (const dateStr of sortedDates) {
    const d = new Date(dateStr + 'T00:00:00');
    const weekKey = getISOWeekKey(d);

    if (!weekMap.has(weekKey)) {
      weekMap.set(weekKey, { hours: 0, earnings: 0, shifts: 0, days: new Set() });
    }
    const week = weekMap.get(weekKey)!;

    for (const s of shiftsByDate.get(dateStr)!) {
      const rate = getEffectiveRateForWeekly(s.companyId, dateStr, s.payRate, companyMap, rateHistoryMap);
      week.hours += s.totalHours;
      week.earnings += s.totalHours * rate;
      week.shifts += 1;
      week.days.add(dateStr);
    }
  }

  const weekRows: string[] = [];
  let weekNum = 1;
  for (const [weekKey, data] of weekMap) {
    const [weekStart, weekEnd] = weekKey.split('|');
    const startDate = new Date(weekStart + 'T00:00:00');
    const endDate = new Date(weekEnd + 'T00:00:00');
    const label = `${startDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} – ${endDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}`;

    weekRows.push(`
      <tr>
        <td style="font-weight:600;">Week ${weekNum}</td>
        <td>${label}</td>
        <td class="num">${data.days.size}</td>
        <td class="num">${data.shifts}</td>
        <td class="num">${data.hours.toFixed(1)}h</td>
        <td class="num" style="font-weight:600;color:#059669;">&pound;${data.earnings.toFixed(2)}</td>
      </tr>
    `);
    weekNum++;
  }

  return `
    <div class="weekly-section">
      <div class="table-title">Weekly Summary</div>
      <table class="weekly-table">
        <thead>
          <tr>
            <th>Week</th>
            <th>Period</th>
            <th class="num">Days</th>
            <th class="num">Shifts</th>
            <th class="num">Hours</th>
            <th class="num">Earnings</th>
          </tr>
        </thead>
        <tbody>
          ${weekRows.join('')}
        </tbody>
      </table>
    </div>
  `;
}

function getISOWeekKey(d: Date): string {
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d);
  monday.setDate(diff);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const fmt = (dt: Date) => `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
  return `${fmt(monday)}|${fmt(sunday)}`;
}

function getEffectiveRateForWeekly(
  companyId: string,
  date: string,
  shiftRate: number,
  companyMap: Map<string, any>,
  rateHistoryMap: Map<string, any[]>,
): number {
  if (shiftRate && shiftRate > 0) return shiftRate;
  const history = rateHistoryMap.get(companyId) || [];
  const effectiveRate = history.find((r: any) => r.effectiveFrom <= date);
  if (effectiveRate) return effectiveRate.payRate;
  return companyMap.get(companyId)?.payRate || 0;
}
