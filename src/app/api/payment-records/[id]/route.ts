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
    const existing = await db.paymentRecord.findUnique({ where: { id } });
    if (!existing || existing.userId !== user.id) {
      return NextResponse.json({ error: 'Payment record not found' }, { status: 404 });
    }

    const body = await request.json();
    const { companyId, month, year, totalExpected, totalReceived, totalHMRC, workedHours, notes, status: inputStatus } = body;

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
      include: {
        company: {
          select: { id: true, name: true },
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
