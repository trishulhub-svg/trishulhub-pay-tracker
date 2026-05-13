import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/session';

// SHI-020: Valid shift types enum
const VALID_SHIFT_TYPES = ['REGULAR', 'OVERTIME', 'HOLIDAY', 'SICK', 'ON_CALL'] as const;

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
    const existing = await db.shift.findUnique({ where: { id } });
    if (!existing || existing.userId !== user.id) {
      return NextResponse.json({ error: 'Shift not found' }, { status: 404 });
    }

    const body = await request.json();
    const { companyId, date, startTime, endTime, breakMinutes, shiftType, notes, payRate, client } = body;

    // SHI-001: Verify new company belongs to user if companyId is being changed
    if (companyId !== undefined && companyId !== existing.companyId) {
      const company = await db.company.findUnique({ where: { id: companyId } });
      if (!company || company.userId !== user.id) {
        return NextResponse.json({ error: 'Company not found' }, { status: 404 });
      }
    }

    // SHI-006: Validate date if provided
    if (date !== undefined) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(date)) {
        return NextResponse.json({ error: 'Date must be in YYYY-MM-DD format' }, { status: 400 });
      }
      const dateObj = new Date(`${date}T00:00:00`);
      if (isNaN(dateObj.getTime())) {
        return NextResponse.json({ error: 'Invalid date' }, { status: 400 });
      }
    }

    // SHI-002: Validate breakMinutes >= 0
    if (breakMinutes !== undefined && breakMinutes !== null && Number(breakMinutes) < 0) {
      return NextResponse.json({ error: 'Break minutes cannot be negative' }, { status: 400 });
    }

    // SHI-007: Validate payRate >= 0
    if (payRate !== undefined && payRate !== null && Number(payRate) < 0) {
      return NextResponse.json({ error: 'Pay rate cannot be negative' }, { status: 400 });
    }

    // SHI-005: Validate notes and client max length
    if (notes !== undefined && notes !== null && typeof notes === 'string' && notes.length > 1000) {
      return NextResponse.json({ error: 'Notes must be under 1000 characters' }, { status: 400 });
    }
    if (client !== undefined && client !== null && typeof client === 'string' && client.length > 200) {
      return NextResponse.json({ error: 'Client name must be under 200 characters' }, { status: 400 });
    }

    // SHI-020: Validate shiftType against enum
    if (shiftType !== undefined && !VALID_SHIFT_TYPES.includes(shiftType as any)) {
      return NextResponse.json({ error: `Invalid shift type. Must be one of: ${VALID_SHIFT_TYPES.join(', ')}` }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};
    if (companyId !== undefined) updateData.companyId = companyId;
    if (date !== undefined) updateData.date = date;
    if (startTime !== undefined) updateData.startTime = startTime;
    if (endTime !== undefined) updateData.endTime = endTime;
    if (breakMinutes !== undefined) updateData.breakMinutes = breakMinutes;
    if (shiftType !== undefined) updateData.shiftType = shiftType;
    if (payRate !== undefined) updateData.payRate = payRate;
    if (notes !== undefined) updateData.notes = notes || null;
    if (client !== undefined) updateData.client = client || null;

    // Recalculate total hours if time fields changed
    if (startTime !== undefined || endTime !== undefined || breakMinutes !== undefined) {
      const st = startTime ?? existing.startTime;
      const et = endTime ?? existing.endTime;
      const brk = breakMinutes !== undefined ? (breakMinutes || 0) : existing.breakMinutes;

      const [startH, startM] = st.split(':').map(Number);
      const [endH, endM] = et.split(':').map(Number);
      let startMinutes = startH * 60 + startM;
      let endMinutes = endH * 60 + endM;

      // SHI-004: Use strict < for overnight detection (=== means 0-hour shift)
      if (endMinutes < startMinutes) {
        endMinutes += 24 * 60;
      }

      const workedMinutes = endMinutes - startMinutes - brk;
      updateData.totalHours = Math.max(0, Math.round((workedMinutes / 60) * 100) / 100);
    }

    // SHI-012: Use update + findUnique for consistent response shape
    await db.shift.update({
      where: { id },
      data: updateData,
    });
    const shift = await db.shift.findUnique({ where: { id } });

    return NextResponse.json({ shift });
  } catch (error) {
    console.error('Update shift error:', error);
    return NextResponse.json({ error: 'Failed to update shift' }, { status: 500 });
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
    const existing = await db.shift.findUnique({ where: { id } });
    if (!existing || existing.userId !== user.id) {
      return NextResponse.json({ error: 'Shift not found' }, { status: 404 });
    }

    await db.shift.delete({ where: { id } });

    // SHI-014: Return 204 No Content for successful DELETE
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Delete shift error:', error);
    return NextResponse.json({ error: 'Failed to delete shift' }, { status: 500 });
  }
}
