import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/session';

// Get total shift hours for a specific company/month/year - used to auto-populate payment forms
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

    if (!companyId || !month || !year) {
      return NextResponse.json({ error: 'companyId, month, and year are required' }, { status: 400 });
    }

    const m = parseInt(month);
    const y = parseInt(year);
    const startDate = `${y}-${String(m).padStart(2, '0')}-01`;
    const endDate = m === 12
      ? `${y + 1}-01-01`
      : `${y}-${String(m + 1).padStart(2, '0')}-01`;

    const shifts = await db.shift.findMany({
      where: {
        userId: user.id,
        companyId,
        date: { gte: startDate, lt: endDate },
      },
    });

    const totalHours = shifts.reduce((acc, s) => acc + s.totalHours, 0);
    const totalShifts = shifts.length;

    return NextResponse.json({
      totalHours: Math.round(totalHours * 100) / 100,
      totalShifts,
      shifts: shifts.map(s => ({
        id: s.id,
        date: s.date,
        startTime: s.startTime,
        endTime: s.endTime,
        totalHours: s.totalHours,
        shiftType: s.shiftType,
      })),
    });
  } catch (error) {
    console.error('Shift hours error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
