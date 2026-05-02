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
    const status = searchParams.get('status');

    const where: Record<string, unknown> = { userId: user.id };

    if (companyId) where.companyId = companyId;
    if (month) where.month = parseInt(month);
    if (year) where.year = parseInt(year);
    if (status) where.status = status;

    const records = await db.paymentRecord.findMany({
      where,
      include: {
        company: {
          select: { id: true, name: true },
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
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { companyId, month, year, totalExpected, totalReceived, totalHMRC, workedHours, notes, status: inputStatus } = body;

    if (!companyId || !month || !year) {
      return NextResponse.json({ error: 'Company, month, and year are required' }, { status: 400 });
    }

    // Verify company belongs to user
    const company = await db.company.findUnique({ where: { id: companyId } });
    if (!company || company.userId !== user.id) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const totalDue = Math.max(0, (totalExpected || 0) - (totalReceived || 0));
    const autoStatus = inputStatus || (totalDue <= 0 && (totalReceived || 0) > 0 ? 'PAID' : 'PENDING');

    // Check for existing record
    const existing = await db.paymentRecord.findUnique({
      where: { userId_companyId_month_year: { userId: user.id, companyId, month, year } },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'A payment record already exists for this company/month/year' },
        { status: 409 }
      );
    }

    const record = await db.paymentRecord.create({
      data: {
        userId: user.id,
        companyId,
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
        company: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json({ record }, { status: 201 });
  } catch (error) {
    console.error('Create payment record error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
