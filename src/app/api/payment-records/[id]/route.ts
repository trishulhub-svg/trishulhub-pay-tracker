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

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { id } = await params;

    // Verify ownership
    const existing = await db.paymentRecord.findUnique({ where: { id } });
    if (!existing || existing.userId !== user.id) {
      return NextResponse.json({ error: 'Payment record not found' }, { status: 404 });
    }

    const body = await request.json();
    const { companyId, month, year, totalExpected, totalReceived, totalHMRC, workedHours, notes, status: inputStatus } = body;

    // REC-002: Validate month/year if provided
    if (month !== undefined) {
      const err = validateMonth(month);
      if (err) return NextResponse.json({ error: err }, { status: 400 });
    }
    if (year !== undefined) {
      const err = validateYear(year);
      if (err) return NextResponse.json({ error: err }, { status: 400 });
    }

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

    // REC-007: Check for duplicate conflict if company/month/year is changing
    if (companyId !== undefined || month !== undefined || year !== undefined) {
      const newCompanyId = companyId !== undefined ? companyId : existing.companyId;
      const newMonth = month !== undefined ? month : existing.month;
      const newYear = year !== undefined ? year : existing.year;
      const conflict = await db.paymentRecord.findUnique({
        where: { userId_companyId_month_year: { userId: user.id, companyId: newCompanyId, month: newMonth, year: newYear } },
      });
      if (conflict && conflict.id !== id) {
        return NextResponse.json(
          { error: 'A payment record already exists for this company/month/year' },
          { status: 409 }
        );
      }
    }

    const updateData: Record<string, unknown> = {};
    if (companyId !== undefined) updateData.companyId = companyId;
    if (month !== undefined) updateData.month = month;
    if (year !== undefined) updateData.year = year;
    if (totalExpected !== undefined) updateData.totalExpected = totalExpected;
    if (totalReceived !== undefined) updateData.totalReceived = totalReceived;
    if (totalHMRC !== undefined) updateData.totalHMRC = totalHMRC;
    if (workedHours !== undefined) updateData.workedHours = workedHours;
    if (notes !== undefined) updateData.notes = notes || null;

    // Auto-calculate totalDue if expected or received changed
    if (totalExpected !== undefined || totalReceived !== undefined) {
      const expected = totalExpected !== undefined ? totalExpected : existing.totalExpected;
      const received = totalReceived !== undefined ? totalReceived : existing.totalReceived;
      updateData.totalDue = Math.max(0, expected - received);
      updateData.status = inputStatus || ((updateData.totalDue as number) <= 0 && received > 0 ? 'PAID' : 'PENDING');
    } else if (inputStatus) {
      updateData.status = inputStatus;
    }

    const record = await db.paymentRecord.update({
      where: { id },
      data: updateData,
    } as any);

    return NextResponse.json({ record });
  } catch (error) {
    console.error('Update payment record error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { id } = await params;

    // Verify ownership
    const existing = await db.paymentRecord.findUnique({ where: { id } });
    if (!existing || existing.userId !== user.id) {
      return NextResponse.json({ error: 'Payment record not found' }, { status: 404 });
    }

    await db.paymentRecord.delete({ where: { id } });

    return NextResponse.json({ message: 'Payment record deleted successfully' });
  } catch (error) {
    console.error('Delete payment record error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
