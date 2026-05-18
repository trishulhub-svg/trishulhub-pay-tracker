import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/session';

// DELETE /api/import/logs/[id] — Delete an import history entry
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (!user.isPremium) {
      return NextResponse.json({ error: 'Premium access required' }, { status: 403 });
    }

    const { id } = await params;

    // Find the import log entry
    const importEntry = await db.importLog.findUnique({ where: { id } });
    if (!importEntry) {
      return NextResponse.json({ error: 'Import record not found' }, { status: 404 });
    }

    // Verify ownership
    if (importEntry.userId !== user.id) {
      return NextResponse.json({ error: 'You can only delete your own import history' }, { status: 403 });
    }

    // If the import is not reversed, also delete the associated data
    if (!importEntry.reversed) {
      const { getTursoClientIfAvailable } = await import('@/lib/db');
      const tursoClient = getTursoClientIfAvailable();

      // Delete shifts
      if (importEntry.shiftIds && importEntry.shiftIds.length > 0) {
        if (tursoClient) {
          const placeholders = importEntry.shiftIds.map(() => '?').join(', ');
          try { await tursoClient.execute({ sql: `DELETE FROM Shift WHERE id IN (${placeholders})`, args: importEntry.shiftIds }); } catch {}
        } else {
          await Promise.all(importEntry.shiftIds.map((sid: string) => db.shift.delete({ where: { id: sid } }).catch(() => {})));
        }
      }

      // Delete payments
      if (importEntry.paymentIds && importEntry.paymentIds.length > 0) {
        if (tursoClient) {
          const placeholders = importEntry.paymentIds.map(() => '?').join(', ');
          try { await tursoClient.execute({ sql: `DELETE FROM PaymentRecord WHERE id IN (${placeholders})`, args: importEntry.paymentIds }); } catch {}
        } else {
          await Promise.all(importEntry.paymentIds.map((pid: string) => db.paymentRecord.delete({ where: { id: pid } }).catch(() => {})));
        }
      }

      // Delete auto-created companies (only if empty)
      if (importEntry.companyIds && importEntry.companyIds.length > 0) {
        for (const companyId of importEntry.companyIds) {
          try {
            const remainingShifts = await db.shift.count({ where: { companyId } });
            const remainingPayments = await db.paymentRecord.count({ where: { companyId } });
            if (remainingShifts === 0 && remainingPayments === 0) {
              await db.company.delete({ where: { id: companyId } });
            }
          } catch {}
        }
      }
    }

    // Delete the import log entry itself
    await db.importLog.delete({ where: { id } });

    return NextResponse.json({
      success: true,
      message: 'Import history deleted successfully.',
    });
  } catch (error) {
    console.error('Import log delete error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete import history' },
      { status: 500 }
    );
  }
}
