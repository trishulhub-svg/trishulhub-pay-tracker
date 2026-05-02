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
    const month = searchParams.get('month');
    const year = searchParams.get('year');

    const where: Record<string, unknown> = { userId: user.id };
    if (companyId) where.companyId = companyId;

    // Filter by month/year if provided
    if (month && year) {
      const m = parseInt(month);
      const y = parseInt(year);
      const startDate = `${y}-${String(m).padStart(2, '0')}-01`;
      const endDate = m === 12
        ? `${y + 1}-01-01`
        : `${y}-${String(m + 1).padStart(2, '0')}-01`;
      where.date = { gte: startDate, lt: endDate };
    }

    const shifts = await db.shift.findMany({
      where,
      include: {
        company: { select: { id: true, name: true } },
      },
      orderBy: { date: 'desc' },
    });

    // Calculate totals
    const totals = shifts.reduce(
      (acc, s) => ({
        totalHours: acc.totalHours + s.totalHours,
        totalBreakMinutes: acc.totalBreakMinutes + s.breakMinutes,
        totalShifts: acc.totalShifts + 1,
      }),
      { totalHours: 0, totalBreakMinutes: 0, totalShifts: 0 }
    );

    return NextResponse.json({ shifts, totals });
  } catch (error) {
    console.error('Shifts list error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { companyId, date, startTime, endTime, breakMinutes, shiftType, notes, payRate } = body;

    if (!companyId || !date || !startTime || !endTime) {
      return NextResponse.json({ error: 'Company, date, start time, and end time are required' }, { status: 400 });
    }

    // Verify company belongs to user
    const company = await db.company.findUnique({ where: { id: companyId } });
    if (!company || company.userId !== user.id) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    // Use provided payRate, or fall back to company's payRate
    const shiftPayRate = payRate !== undefined ? (parseFloat(payRate) || 0) : (company.payRate || 0);

    // Calculate total hours
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);
    let startMinutes = startH * 60 + startM;
    let endMinutes = endH * 60 + endM;

    // Handle overnight shifts
    if (endMinutes <= startMinutes) {
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
      },
      include: {
        company: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ shift }, { status: 201 });
  } catch (error) {
    console.error('Create shift error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
