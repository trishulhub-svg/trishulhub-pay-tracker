import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/session';

// POST /api/import/reverse — Reverse/undo an import, deleting all data from that import
export async function POST(request: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (!user.isPremium) {
      return NextResponse.json({ error: 'Premium access required' }, { status: 403 });
    }

    const body = await request.json();
    const { importId } = body as { importId: string };

    if (!importId) {
      return NextResponse.json({ error: 'Import ID is required' }, { status: 400 });
    }

    // Find the import log entry
    const importEntry = await db.importLog.findUnique({ where: { id: importId } });
    if (!importEntry) {
      return NextResponse.json({ error: 'Import record not found' }, { status: 404 });
    }

    // Verify this import belongs to the current user
    if (importEntry.userId !== user.id) {
      return NextResponse.json({ error: 'You can only reverse your own imports' }, { status: 403 });
    }

    // Check if already reversed
    if (importEntry.reversed) {
      return NextResponse.json({ error: 'This import has already been reversed' }, { status: 400 });
    }

    const results = {
      shiftsDeleted: 0,
      paymentsDeleted: 0,
      companiesDeleted: 0,
      errors: [] as string[],
    };

    // Delete all shifts from this import
    for (const shiftId of importEntry.shiftIds) {
      try {
        await db.shift.delete({ where: { id: shiftId } });
        results.shiftsDeleted++;
      } catch (e) {
        // Shift might have been manually deleted already
        console.warn(`[IMPORT REVERSE] Shift ${shiftId} not found or already deleted`);
      }
    }

    // Delete all payment records from this import
    for (const paymentId of importEntry.paymentIds) {
      try {
        await db.paymentRecord.delete({ where: { id: paymentId } });
        results.paymentsDeleted++;
      } catch (e) {
        // Payment might have been manually deleted already
        console.warn(`[IMPORT REVERSE] Payment ${paymentId} not found or already deleted`);
      }
    }

    // Delete companies that were auto-created by this import
    // Only delete if the company has no other shifts or payments linked to it
    for (const companyId of importEntry.companyIds) {
      try {
        // Check if company has any remaining shifts or payments
        const remainingShifts = await db.shift.count({ where: { companyId } });
        const remainingPayments = await db.paymentRecord.count({ where: { companyId } });

        if (remainingShifts === 0 && remainingPayments === 0) {
          await db.company.delete({ where: { id: companyId } });
          results.companiesDeleted++;
        }
        // If company still has other data, don't delete it — it might have been used elsewhere
      } catch (e) {
        console.warn(`[IMPORT REVERSE] Company ${companyId} not found or already deleted`);
      }
    }

    // Mark the import as reversed
    await db.importLog.update({
      where: { id: importId },
      data: {
        reversed: true,
        reversedAt: new Date(),
      },
    });

    console.log(`[IMPORT REVERSE] User ${user.email} reversed import ${importId}: ${results.shiftsDeleted} shifts, ${results.paymentsDeleted} payments, ${results.companiesDeleted} companies deleted`);

    return NextResponse.json({
      success: true,
      message: `Import reversed successfully. ${results.shiftsDeleted} shift(s), ${results.paymentsDeleted} payment(s), and ${results.companiesDeleted} company/companies removed.`,
      results,
    });
  } catch (error) {
    console.error('Import reverse error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to reverse import' },
      { status: 500 }
    );
  }
}
