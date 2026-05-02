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
    const body = await request.json();
    const { name, payRate, effectiveFrom } = body;

    // Verify ownership
    const company = await db.company.findUnique({ where: { id } });
    if (!company || company.userId !== user.id) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const updateData: any = {};
    if (name !== undefined) {
      if (!name.trim()) {
        return NextResponse.json({ error: 'Company name is required' }, { status: 400 });
      }
      // Check for duplicate name
      const existingWithName = await db.company.findUnique({
        where: { userId_name: { userId: user.id, name: name.trim() } },
      });
      if (existingWithName && existingWithName.id !== id) {
        return NextResponse.json({ error: 'A company with this name already exists' }, { status: 409 });
      }
      updateData.name = name.trim();
    }

    if (payRate !== undefined) {
      const newPayRate = parseFloat(payRate) || 0;
      updateData.payRate = newPayRate;

      // If effectiveFrom is provided, create a pay rate history entry
      if (effectiveFrom && newPayRate > 0) {
        await db.payRateHistory.create({
          data: {
            companyId: id,
            payRate: newPayRate,
            effectiveFrom: effectiveFrom, // YYYY-MM-DD format
          },
        });
      }
    }

    const updatedCompany = await db.company.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ company: updatedCompany });
  } catch (error) {
    console.error('Update company error:', error);
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
    const company = await db.company.findUnique({ where: { id } });
    if (!company || company.userId !== user.id) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    await db.company.delete({ where: { id } });

    return NextResponse.json({ message: 'Company deleted successfully' });
  } catch (error) {
    console.error('Delete company error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
