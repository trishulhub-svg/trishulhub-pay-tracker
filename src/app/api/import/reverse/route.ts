import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/session';

// Allow up to 60s for large reverse operations on Vercel
export const maxDuration = 60;

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

    // Use batch DELETE via Turso direct client for performance
    const { getTursoClientIfAvailable } = await import('@/lib/db');
    const tursoClient = getTursoClientIfAvailable();

    // ─── Batch delete shifts ───
    if (importEntry.shiftIds && importEntry.shiftIds.length > 0) {
      if (tursoClient) {
        // Turso: single batch DELETE with IN clause
        const placeholders = importEntry.shiftIds.map(() => '?').join(', ');
        try {
          await tursoClient.execute({
            sql: `DELETE FROM Shift WHERE id IN (${placeholders})`,
            args: importEntry.shiftIds,
          });
          results.shiftsDeleted = importEntry.shiftIds.length;
        } catch (e) {
          // Fallback to sequential
          for (const shiftId of importEntry.shiftIds) {
            try { await db.shift.delete({ where: { id: shiftId } }); results.shiftsDeleted++; } catch {}
          }
        }
      } else {
        // Local SQLite: parallel deletes
        await Promise.all(importEntry.shiftIds.map((shiftId: string) =>
          db.shift.delete({ where: { id: shiftId } }).then(() => { results.shiftsDeleted++; }).catch(() => {})
        ));
      }
    }

    // ─── Batch delete payments ───
    if (importEntry.paymentIds && importEntry.paymentIds.length > 0) {
      if (tursoClient) {
        const placeholders = importEntry.paymentIds.map(() => '?').join(', ');
        try {
          await tursoClient.execute({
            sql: `DELETE FROM PaymentRecord WHERE id IN (${placeholders})`,
            args: importEntry.paymentIds,
          });
          results.paymentsDeleted = importEntry.paymentIds.length;
        } catch (e) {
          for (const paymentId of importEntry.paymentIds) {
            try { await db.paymentRecord.delete({ where: { id: paymentId } }); results.paymentsDeleted++; } catch {}
          }
        }
      } else {
        await Promise.all(importEntry.paymentIds.map((paymentId: string) =>
          db.paymentRecord.delete({ where: { id: paymentId } }).then(() => { results.paymentsDeleted++; }).catch(() => {})
        ));
      }
    }

    // ─── Delete auto-created companies (only if empty) ───
    if (importEntry.companyIds && importEntry.companyIds.length > 0) {
      for (const companyId of importEntry.companyIds) {
        try {
          const remainingShifts = await db.shift.count({ where: { companyId } });
          const remainingPayments = await db.paymentRecord.count({ where: { companyId } });

          if (remainingShifts === 0 && remainingPayments === 0) {
            await db.company.delete({ where: { id: companyId } });
            results.companiesDeleted++;
          }
        } catch (e) {
          console.warn(`[IMPORT REVERSE] Company ${companyId} not found or already deleted`);
        }
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
