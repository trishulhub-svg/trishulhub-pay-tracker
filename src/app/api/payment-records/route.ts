import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/session';

// REC-003: Status allowlist
const VALID_STATUSES = ['PENDING', 'PAID'] as const;

// REC-001: Numeric field validation — reject negative amounts
function validateNumericField(value: unknown, fieldName: string): string | null {
  if (value === undefined || value === null) return null;
  const num = Number(value);
  if (isNaN(num)) return `${fieldName} must be a valid number`;
  if (num < 0) return `${fieldName} cannot be negative`;
  return null;
}

// REC-002: Month/year range validation
function validateMonth(value: unknown): string | null {
  const num = parseInt(String(value));
  if (isNaN(num) || num < 1 || num > 12) return 'Month must be between 1 and 12';
  return null;
}

function validateYear(value: unknown): string | null {
  const num = parseInt(String(value));
  if (isNaN(num) || num < 2000 || num > 2100) return 'Year must be between 2000 and 2100';
  return null;
}

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
    // REC-011: Pagination support
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam) : undefined;

    const where: Record<string, unknown> = { userId: user.id };

    if (companyId) where.companyId = companyId;
    if (month) {
      const monthErr = validateMonth(month);
      if (monthErr) return NextResponse.json({ error: monthErr }, { status: 400 });
      where.month = parseInt(month);
    }
    if (year) {
      const yearErr = validateYear(year);
      if (yearErr) return NextResponse.json({ error: yearErr }, { status: 400 });
      where.year = parseInt(year);
    }
    if (status) {
      // REC-003: Validate status filter value
      if (!VALID_STATUSES.includes(status as any)) {
        return NextResponse.json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` }, { status: 400 });
      }
      where.status = status;
    }

    const queryOpts: any = {
      where,
      include: {
        company: {
          select: { id: true, name: true },
        },
      },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    };
    // REC-011: Apply limit if provided (max 500 safety cap)
    if (limit && limit > 0) {
      queryOpts.take = Math.min(limit, 500);
    } else {
      // Default safety cap — prevent unbounded loads
      queryOpts.take = 500;
    }

    const records = await db.paymentRecord.findMany(queryOpts);

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

    // REC-002: Validate month/year ranges
    const monthErr = validateMonth(month);
    if (monthErr) return NextResponse.json({ error: monthErr }, { status: 400 });
    const yearErr = validateYear(year);
    if (yearErr) return NextResponse.json({ error: yearErr }, { status: 400 });

    // REC-001: Validate numeric fields — reject negative amounts
    const numericChecks = [
      validateNumericField(totalExpected, 'Total expected'),
      validateNumericField(totalReceived, 'Total received'),
      validateNumericField(totalHMRC, 'Total HMRC'),
      validateNumericField(workedHours, 'Worked hours'),
    ];
    const validationError = numericChecks.find(err => err !== null);
    if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });

    // REC-003: Validate status value
    if (inputStatus && !VALID_STATUSES.includes(inputStatus)) {
      return NextResponse.json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` }, { status: 400 });
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
  } catch (error: unknown) {
    console.error('Create payment record error:', error);
    // REC-009: Catch unique constraint violation for better error message
    if (error && typeof error === 'object' && 'code' in error && (error as any).code === 'P2002') {
      return NextResponse.json({ error: 'A payment record already exists for this company/month/year' }, { status: 409 });
    }
    if (error instanceof Error && String(error).includes('UNIQUE constraint failed')) {
      return NextResponse.json({ error: 'A payment record already exists for this company/month/year' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
