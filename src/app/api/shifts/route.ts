import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/session';

// SHI-020: Valid shift types enum
const VALID_SHIFT_TYPES = ['REGULAR', 'OVERTIME', 'HOLIDAY', 'SICK', 'ON_CALL'] as const;

export async function GET(request: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    const month = searchParams.get('month');
    const year = searchParams.get('year');
    const limitParam = searchParams.get('limit');

    const where: Record<string, unknown> = { userId: user.id };
    if (companyId) where.companyId = companyId;

    // Filter by month/year if provided
    if (month && year) {
      const m = parseInt(month);
      const y = parseInt(year);
      // SHI-005: Validate month/year range to prevent NaN date strings
      if (isNaN(m) || m < 1 || m > 12 || isNaN(y) || y < 2020 || y > 2099) {
        return NextResponse.json({ error: 'Invalid month (1-12) or year (2020-2099)' }, { status: 400 });
      }
      const startDate = `${y}-${String(m).padStart(2, '0')}-01`;
      const endDate = m === 12
        ? `${y + 1}-01-01`
        : `${y}-${String(m + 1).padStart(2, '0')}-01`;
      where.date = { gte: startDate, lt: endDate };
    }

    // SHI-003: Support limit parameter for pagination (default: 200, max: 500)
    const queryLimit = limitParam ? Math.min(parseInt(limitParam) || 200, 500) : 200;

    const shifts = await db.shift.findMany({
      where,
      orderBy: { date: 'desc' },
    });

    // Apply limit after fetch (totals need full dataset for accurate aggregation)
    const limitedShifts = shifts.slice(0, queryLimit);

    // Calculate totals
    const totals = shifts.reduce(
      (acc, s) => ({
        totalHours: acc.totalHours + s.totalHours,
        totalBreakMinutes: acc.totalBreakMinutes + s.breakMinutes,
        totalShifts: acc.totalShifts + 1,
      }),
      { totalHours: 0, totalBreakMinutes: 0, totalShifts: 0 }
    );

    return NextResponse.json({ shifts: limitedShifts, totals, hasMore: shifts.length > queryLimit });
  } catch (error) {
    console.error('Shifts list error:', error);
    return NextResponse.json({ error: 'Failed to load shifts' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { companyId, date, startTime, endTime, breakMinutes, shiftType, notes, payRate, client } = body;

    if (!companyId || !date || !startTime || !endTime) {
      return NextResponse.json({ error: 'Company, date, start time, and end time are required' }, { status: 400 });
    }

    // CODE-004: Validate time format (HH:MM)
    const timeRegex = /^([01]?\d|2[0-3]):([0-5]\d)$/;
    if (!timeRegex.test(startTime)) {
      return NextResponse.json({ error: 'Start time must be in HH:MM format (e.g., 09:00)' }, { status: 400 });
    }
    if (!timeRegex.test(endTime)) {
      return NextResponse.json({ error: 'End time must be in HH:MM format (e.g., 17:00)' }, { status: 400 });
    }

    // SHI-006: Validate date format AND semantics (reject impossible dates like 2025-13-99)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return NextResponse.json({ error: 'Date must be in YYYY-MM-DD format' }, { status: 400 });
    }
    const dateObj = new Date(`${date}T00:00:00`);
    if (isNaN(dateObj.getTime())) {
      return NextResponse.json({ error: 'Invalid date' }, { status: 400 });
    }

    // SHI-002: Validate breakMinutes is a valid non-negative number (reject NaN/Infinity)
    if (breakMinutes !== undefined && breakMinutes !== null) {
      const brk = Number(breakMinutes);
      if (!Number.isFinite(brk) || brk < 0) {
        return NextResponse.json({ error: 'Break minutes must be a valid non-negative number' }, { status: 400 });
      }
    }

    // SHI-002: Validate payRate is a valid non-negative number (reject NaN/Infinity)
    if (payRate !== undefined && payRate !== null) {
      const rate = Number(payRate);
      if (!Number.isFinite(rate) || rate < 0) {
        return NextResponse.json({ error: 'Pay rate must be a valid non-negative number' }, { status: 400 });
      }
    }

    // SHI-005: Validate notes and client max length
    if (notes && typeof notes === 'string' && notes.length > 1000) {
      return NextResponse.json({ error: 'Notes must be under 1000 characters' }, { status: 400 });
    }
    if (client && typeof client === 'string' && client.length > 200) {
      return NextResponse.json({ error: 'Client name must be under 200 characters' }, { status: 400 });
    }

    // SHI-020: Validate shiftType against enum
    if (shiftType && !VALID_SHIFT_TYPES.includes(shiftType as any)) {
      return NextResponse.json({ error: `Invalid shift type. Must be one of: ${VALID_SHIFT_TYPES.join(', ')}` }, { status: 400 });
    }

    // Verify company belongs to user
    const company = await db.company.findUnique({ where: { id: companyId } });
    if (!company || company.userId !== user.id) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    // Use provided payRate, or fall back to effective pay rate from history, then company's payRate
    let shiftPayRate = company.payRate || 0;
    if (payRate !== undefined) {
      shiftPayRate = parseFloat(payRate) || 0;
    } else {
      try {
        const rateHistory = await db.payRateHistory.findMany({
          where: { companyId, effectiveFrom: { lte: date } },
          orderBy: { effectiveFrom: 'desc' },
        });
        if (rateHistory.length > 0) {
          shiftPayRate = rateHistory[0].payRate;
        }
      } catch {
        // If pay rate history lookup fails, fall back to company rate
      }
    }

    // Calculate total hours
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);
    let startMinutes = startH * 60 + startM;
    let endMinutes = endH * 60 + endM;

    // SHI-004: Use strict < for overnight detection (=== means 0-hour shift, not 24-hour)
    if (endMinutes < startMinutes) {
      endMinutes += 24 * 60; // Add a day
    }

    const workedMinutes = endMinutes - startMinutes - (breakMinutes || 0);
    const totalHours = Math.max(0, workedMinutes / 60);

    const shift = await db.shift.create({
      data: {
        userId: user.id,
        companyId,
        date,
        startTime,
        endTime,
        breakMinutes: breakMinutes || 0,
        totalHours: Math.round(totalHours * 100) / 100,
        shiftType: shiftType || 'REGULAR',
        payRate: shiftPayRate,
        notes: notes || null,
        client: client || null,
      },
    } as any);

    return NextResponse.json({ shift }, { status: 201 });
  } catch (error) {
    console.error('Create shift error:', error);
    return NextResponse.json({ error: 'Failed to create shift' }, { status: 500 });
  }
}
