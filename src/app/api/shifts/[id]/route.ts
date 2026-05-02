import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/session';

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
    const { companyId, date, startTime, endTime, breakMinutes, shiftType, notes } = body;

    const updateData: Record<string, unknown> = {};
    if (companyId !== undefined) updateData.companyId = companyId;
    if (date !== undefined) updateData.date = date;
    if (startTime !== undefined) updateData.startTime = startTime;
    if (endTime !== undefined) updateData.endTime = endTime;
    if (breakMinutes !== undefined) updateData.breakMinutes = breakMinutes;
    if (shiftType !== undefined) updateData.shiftType = shiftType;
    // location field removed from UI - always null
    if (notes !== undefined) updateData.notes = notes || null;

    // Recalculate total hours if time fields changed
    if (startTime !== undefined || endTime !== undefined || breakMinutes !== undefined) {
      const st = startTime ?? existing.startTime;
      const et = endTime ?? existing.endTime;
      const brk = breakMinutes ?? existing.breakMinutes;

      const [startH, startM] = st.split(':').map(Number);
      const [endH, endM] = et.split(':').map(Number);
      let startMinutes = startH * 60 + startM;
      let endMinutes = endH * 60 + endM;

      if (endMinutes <= startMinutes) {
        endMinutes += 24 * 60;
      }

      const workedMinutes = endMinutes - startMinutes - brk;
      updateData.totalHours = Math.max(0, Math.round((workedMinutes / 60) * 100) / 100);
    }

    const shift = await db.shift.update({
      where: { id },
      data: updateData,
      include: {
        company: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ shift });
  } catch (error) {
    console.error('Update shift error:', error);
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
    const existing = await db.shift.findUnique({ where: { id } });
    if (!existing || existing.userId !== user.id) {
      return NextResponse.json({ error: 'Shift not found' }, { status: 404 });
    }

    await db.shift.delete({ where: { id } });

    return NextResponse.json({ message: 'Shift deleted successfully' });
  } catch (error) {
    console.error('Delete shift error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
