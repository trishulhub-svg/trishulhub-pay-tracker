import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/session';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSession();
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: user ? 403 : 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { userId, month, year, totalExpected, totalReceived, totalHMRC, workedHours, notes, status: inputStatus } = body;

    const updateData: Record<string, unknown> = {};
    if (userId !== undefined) updateData.userId = userId;
    if (month !== undefined) updateData.month = month;
    if (year !== undefined) updateData.year = year;
    if (totalExpected !== undefined) updateData.totalExpected = totalExpected;
    if (totalReceived !== undefined) updateData.totalReceived = totalReceived;
    if (totalHMRC !== undefined) updateData.totalHMRC = totalHMRC;
    if (workedHours !== undefined) updateData.workedHours = workedHours;
    if (notes !== undefined) updateData.notes = notes || null;

    // Auto-calculate totalDue if expected or received changed
    if (totalExpected !== undefined || totalReceived !== undefined) {
      const current = await db.paymentRecord.findUnique({ where: { id } });
      if (current) {
        const expected = totalExpected !== undefined ? totalExpected : current.totalExpected;
        const received = totalReceived !== undefined ? totalReceived : current.totalReceived;
        updateData.totalDue = Math.max(0, expected - received);
        updateData.status = inputStatus || (updateData.totalDue as number <= 0 && received > 0 ? 'PAID' : 'PENDING');
      }
    } else if (inputStatus) {
      updateData.status = inputStatus;
    }

    const record = await db.paymentRecord.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

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
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: user ? 403 : 401 });
    }

    const { id } = await params;

    await db.paymentRecord.delete({ where: { id } });

    return NextResponse.json({ message: 'Payment record deleted successfully' });
  } catch (error) {
    console.error('Delete payment record error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
