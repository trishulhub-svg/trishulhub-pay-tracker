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
    const userId = searchParams.get('userId');
    const month = searchParams.get('month');
    const year = searchParams.get('year');
    const status = searchParams.get('status');

    const where: Record<string, unknown> = {};

    // Employees can only see their own records
    if (user.role !== 'ADMIN') {
      where.userId = user.id;
    } else if (userId) {
      where.userId = userId;
    }

    if (month) where.month = parseInt(month);
    if (year) where.year = parseInt(year);
    if (status) where.status = status;

    const records = await db.paymentRecord.findMany({
      where,
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });

    // Calculate grand totals
    const totals = records.reduce(
      (acc, r) => ({
        totalExpected: acc.totalExpected + r.totalExpected,
        totalReceived: acc.totalReceived + r.totalReceived,
        totalHMRC: acc.totalHMRC + r.totalHMRC,
        totalDue: acc.totalDue + r.totalDue,
        workedHours: acc.workedHours + r.workedHours,
      }),
      { totalExpected: 0, totalReceived: 0, totalHMRC: 0, totalDue: 0, workedHours: 0 }
    );

    return NextResponse.json({ records, totals });
  } catch (error) {
    console.error('Payment records list error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getSession();
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: user ? 403 : 401 });
    }

    const body = await request.json();
    const { userId, month, year, totalExpected, totalReceived, totalHMRC, workedHours, notes, status: inputStatus } = body;

    if (!userId || !month || !year) {
      return NextResponse.json({ error: 'User, month, and year are required' }, { status: 400 });
    }

    const totalDue = Math.max(0, (totalExpected || 0) - (totalReceived || 0));
    const autoStatus = inputStatus || (totalDue <= 0 && (totalReceived || 0) > 0 ? 'PAID' : 'PENDING');

    // Check for existing record
    const existing = await db.paymentRecord.findUnique({
      where: { userId_month_year: { userId, month, year } },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'A payment record already exists for this user/month/year' },
        { status: 409 }
      );
    }

    const record = await db.paymentRecord.create({
      data: {
        userId,
        month,
        year,
        totalExpected: totalExpected || 0,
        totalReceived: totalReceived || 0,
        totalHMRC: totalHMRC || 0,
        totalDue,
        workedHours: workedHours || 0,
        status: autoStatus,
        notes: notes || null,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return NextResponse.json({ record }, { status: 201 });
  } catch (error) {
    console.error('Create payment record error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
