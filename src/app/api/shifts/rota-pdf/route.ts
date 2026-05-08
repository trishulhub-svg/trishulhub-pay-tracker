import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/session';

// GET /api/shifts/rota-pdf?month=1&year=2025&from=2025-01-01&to=2025-01-31
// Returns an actual PDF binary file
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
    let useLte = false;

    const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];

    if (from && to) {
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
    const companies = await db.company.findMany({ where: { userId: user.id } });
    const companyMap = new Map<string, any>(companies.map((c: any) => [c.id, c]));

    // Fetch pay rate history
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

    function getEffectiveRate(companyId: string, date: string, shiftRate: number): number {
      if (shiftRate && shiftRate > 0) return shiftRate;
      const history = rateHistoryMap.get(companyId) || [];
      const effectiveRate = history.find((r: any) => r.effectiveFrom <= date);
      if (effectiveRate) return effectiveRate.payRate;
      return companyMap.get(companyId)?.payRate || 0;
    }

    // Build PDF using jspdf
    const { default: jsPDF } = await import('jspdf');
    const autoTable = (await import('jspdf-autotable')).default;

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = { left: 10, right: 10, top: 10, bottom: 15 };

    const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    // ===== HEADER =====
    doc.setFillColor(37, 99, 235); // blue-600
    doc.rect(0, 0, pageWidth, 28, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('TrishulHub Pay Tracker', margin.left, 12);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Shift Rota — ${monthLabel}`, margin.left, 18);

    doc.setFontSize(8);
    doc.setTextColor(200, 220, 255);
    const generatedDate = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    doc.text(`${user.name || user.email}  |  Generated: ${generatedDate}`, margin.left, 24);

    // Right side: premium badge
    if (user.isPremium) {
      doc.setFontSize(7);
      doc.setTextColor(255, 215, 0);
      doc.text('★ PREMIUM', pageWidth - margin.right, 12, { align: 'right' });
    }

    doc.setTextColor(0, 0, 0);

    // ===== SUMMARY STATS =====
    let totalHours = 0;
    let totalEarnings = 0;
    const allDatesSet = new Set<string>();

    for (const shift of shifts) {
      const dateStr = shift.date;
      allDatesSet.add(dateStr);
      const rate = getEffectiveRate(shift.companyId, dateStr, shift.payRate);
      const earnings = shift.totalHours * rate;
      totalHours += shift.totalHours;
      totalEarnings += earnings;
    }

    const summaryY = 33;
    const stats = [
      { label: 'Total Hours', value: `${totalHours.toFixed(1)}h` },
      { label: 'Total Shifts', value: `${shifts.length}` },
      { label: 'Total Earnings', value: `£${totalEarnings.toFixed(2)}` },
      { label: 'Working Days', value: `${allDatesSet.size}` },
      { label: 'Avg/Day', value: `£${allDatesSet.size > 0 ? (totalEarnings / allDatesSet.size).toFixed(2) : '0.00'}` },
    ];

    const statWidth = (pageWidth - margin.left - margin.right) / stats.length;
    for (let i = 0; i < stats.length; i++) {
      const x = margin.left + i * statWidth;
      doc.setFillColor(248, 250, 252); // slate-50
      doc.setDrawColor(226, 232, 240); // slate-200
      doc.roundedRect(x + 1, summaryY, statWidth - 2, 16, 2, 2, 'FD');

      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(37, 99, 235);
      doc.text(stats[i].value, x + statWidth / 2, summaryY + 10, { align: 'center' });

      doc.setFontSize(6);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text(stats[i].label.toUpperCase(), x + statWidth / 2, summaryY + 14.5, { align: 'center' });
    }

    doc.setTextColor(0, 0, 0);

    // ===== GROUP SHIFTS BY COMPANY =====
    const shiftsByCompany = new Map<string, any[]>();
    for (const shift of shifts) {
      const companyName = shift.company?.name || 'Unknown';
      if (!shiftsByCompany.has(companyName)) shiftsByCompany.set(companyName, []);
      shiftsByCompany.get(companyName)!.push(shift);
    }

    let currentY = summaryY + 22;

    // Auto-table styles
    const tableStyles = {
      theme: 'grid' as const,
      headStyles: {
        fillColor: [37, 99, 235] as [number, number, number],
        textColor: [255, 255, 255] as [number, number, number],
        fontStyle: 'bold' as const,
        fontSize: 7,
        cellPadding: { top: 2, bottom: 2, left: 2, right: 2 },
      },
      bodyStyles: {
        fontSize: 7,
        cellPadding: { top: 1.5, bottom: 1.5, left: 2, right: 2 },
        textColor: [30, 41, 59] as [number, number, number],
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252] as [number, number, number],
      },
      columnStyles: {
        0: { cellWidth: 18 },  // Date
        1: { cellWidth: 28 },  // Time
        2: { cellWidth: 14, halign: 'right' as const },  // Hours
        3: { cellWidth: 12, halign: 'right' as const },  // Break
        4: { cellWidth: 16 },  // Type
        5: { cellWidth: 22 },  // Client
        6: { cellWidth: 30 },  // Notes
        7: { cellWidth: 16, halign: 'right' as const },  // Rate
        8: { cellWidth: 20, halign: 'right' as const, fontStyle: 'bold' as const },  // Earnings
      },
      margin: { left: margin.left, right: margin.right },
    };

    const sortedCompanyNames = [...shiftsByCompany.keys()].sort();

    for (const companyName of sortedCompanyNames) {
      const companyShifts = shiftsByCompany.get(companyName)!;
      let companyHours = 0;
      let companyEarnings = 0;

      // Check if we need a new page
      if (currentY > pageHeight - 50) {
        doc.addPage();
        currentY = margin.top;
      }

      // Company header
      doc.setFillColor(37, 99, 235);
      doc.roundedRect(margin.left, currentY, pageWidth - margin.left - margin.right, 7, 1.5, 1.5, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text(companyName, margin.left + 4, currentY + 5);
      currentY += 7;
      doc.setTextColor(0, 0, 0);

      const tableBody: any[][] = [];
      for (const s of companyShifts) {
        const d = new Date(s.date + 'T00:00:00');
        const dayName = DAY_NAMES[d.getDay()];
        const dateFormatted = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
        const rate = getEffectiveRate(s.companyId, s.date, s.payRate);
        const earnings = s.totalHours * rate;
        companyHours += s.totalHours;
        companyEarnings += earnings;

        tableBody.push([
          `${dayName}\n${dateFormatted}`,
          `${s.startTime} – ${s.endTime}`,
          `${s.totalHours.toFixed(1)}h`,
          `${s.breakMinutes}m`,
          s.shiftType,
          s.client || '–',
          s.notes || '–',
          `£${rate.toFixed(2)}`,
          `£${earnings.toFixed(2)}`,
        ]);
      }

      autoTable(doc, {
        ...tableStyles,
        startY: currentY,
        head: [['Date', 'Time', 'Hours', 'Break', 'Type', 'Client', 'Notes', 'Rate', 'Earnings']],
        body: tableBody,
        didDrawPage: (data: any) => {
          currentY = data.cursor?.y || currentY;
        },
      });

      currentY = (doc as any).lastAutoTable?.finalY + 3;

      // Company total bar
      doc.setFillColor(240, 253, 244); // green-50
      doc.setDrawColor(200, 230, 201); // green-200
      doc.roundedRect(margin.left, currentY, pageWidth - margin.left - margin.right, 6, 1, 1, 'FD');
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(5, 150, 105); // emerald-600
      doc.text(`${companyName} Total:`, margin.left + 4, currentY + 4);
      doc.text(`${companyHours.toFixed(1)}h  |  £${companyEarnings.toFixed(2)}`, margin.left + 30, currentY + 4);
      currentY += 10;
    }

    if (shifts.length === 0) {
      doc.setFontSize(12);
      doc.setTextColor(148, 163, 184);
      doc.text('No shifts found for this period', pageWidth / 2, currentY + 20, { align: 'center' });
    }

    // ===== WEEKLY SUMMARY =====
    if (shifts.length > 0) {
      const shiftsByDate = new Map<string, any[]>();
      for (const shift of shifts) {
        if (!shiftsByDate.has(shift.date)) shiftsByDate.set(shift.date, []);
        shiftsByDate.get(shift.date)!.push(shift);
      }
      const sortedDates = [...shiftsByDate.keys()].sort();

      // Group into weeks
      const weekMap = new Map<string, { hours: number; earnings: number; shiftCount: number; days: Set<string> }>();
      for (const dateStr of sortedDates) {
        const d = new Date(dateStr + 'T00:00:00');
        const weekKey = getISOWeekKey(d);
        if (!weekMap.has(weekKey)) weekMap.set(weekKey, { hours: 0, earnings: 0, shiftCount: 0, days: new Set() });
        const week = weekMap.get(weekKey)!;
        for (const s of shiftsByDate.get(dateStr)!) {
          const rate = getEffectiveRate(s.companyId, dateStr, s.payRate);
          week.hours += s.totalHours;
          week.earnings += s.totalHours * rate;
          week.shiftCount += 1;
        }
        week.days.add(dateStr);
      }

      if (weekMap.size > 0) {
        if (currentY > pageHeight - 40) {
          doc.addPage();
          currentY = margin.top;
        }

        // Weekly summary title
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(51, 65, 85);
        doc.text('Weekly Summary', margin.left, currentY + 4);
        currentY += 7;

        const weekBody: any[][] = [];
        let weekNum = 1;
        for (const [, data] of weekMap) {
          weekBody.push([
            `Week ${weekNum}`,
            `${data.days.size}`,
            `${data.shiftCount}`,
            `${data.hours.toFixed(1)}h`,
            `£${data.earnings.toFixed(2)}`,
          ]);
          weekNum++;
        }

        autoTable(doc, {
          startY: currentY,
          theme: 'striped',
          headStyles: {
            fillColor: [100, 116, 139] as [number, number, number],
            textColor: [255, 255, 255] as [number, number, number],
            fontStyle: 'bold' as const,
            fontSize: 7,
          },
          bodyStyles: {
            fontSize: 8,
            textColor: [30, 41, 59] as [number, number, number],
          },
          columnStyles: {
            0: { cellWidth: 25 },
            1: { cellWidth: 20, halign: 'right' as const },
            2: { cellWidth: 20, halign: 'right' as const },
            3: { cellWidth: 25, halign: 'right' as const },
            4: { cellWidth: 30, halign: 'right' as const, fontStyle: 'bold' as const },
          },
          margin: { left: margin.left, right: margin.right },
          head: [['Week', 'Days', 'Shifts', 'Hours', 'Earnings']],
          body: weekBody,
        });

        currentY = (doc as any).lastAutoTable?.finalY + 5;
      }
    }

    // ===== FOOTER ON ALL PAGES =====
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `TrishulHub Pay Tracker — ${monthLabel}  |  ${user.name || user.email}`,
        margin.left,
        pageHeight - 6
      );
      doc.text(
        `Page ${i} of ${totalPages}`,
        pageWidth - margin.right,
        pageHeight - 6,
        { align: 'right' }
      );
    }

    // Return PDF binary
    const pdfBuffer = doc.output('arraybuffer');
    const fileName = `TrishulHub-Rota-${monthLabel.replace(/\s+/g, '-')}.pdf`;

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    console.error('Rota PDF error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
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
