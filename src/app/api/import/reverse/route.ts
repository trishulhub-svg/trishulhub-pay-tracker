import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/session';

// Allow up to 60s for large reverse operations on Vercel
export const maxDuration = 60;

// IMP-006: Batch-check companies with a single SQL query
async function findEmptyCompanyIds(tursoClient: any, companyIds: string[]): Promise<string[]> {
  if (companyIds.length === 0) return [];
  if (tursoClient) {
    const placeholders = companyIds.map(() => '?').join(', ');
    const r = await tursoClient.execute({
      sql: `
        SELECT c.id
        FROM Company c
        LEFT JOIN Shift s ON s.companyId = c.id
        LEFT JOIN PaymentRecord pr ON pr.companyId = c.id
        WHERE c.id IN (${placeholders})
        GROUP BY c.id
        HAVING COUNT(s.id) = 0 AND COUNT(pr.id) = 0
      `,
      args: companyIds,
    });
    return r.rows.map((row: any) => row.id);
  }
  // Fallback for local SQLite
  const empty: string[] = [];
  for (const companyId of companyIds) {
    const remainingShifts = await db.shift.count({ where: { companyId } });
    const remainingPayments = await db.paymentRecord.count({ where: { companyId } });
    if (remainingShifts === 0 && remainingPayments === 0) empty.push(companyId);
  }
  return empty;
}

// IMP-011: Count actual rows deleted via SELECT before DELETE
async function batchDeleteWithCount(tursoClient: any, ids: string[], table: string): Promise<number> {
  if (ids.length === 0) return 0;
  if (tursoClient) {
    const placeholders = ids.map(() => '?').join(', ');
    // Count existing rows first
    const countResult = await tursoClient.execute({
      sql: `SELECT COUNT(*) as cnt FROM ${table} WHERE id IN (${placeholders})`,
      args: ids,
    });
    const actualCount = Number(countResult.rows[0]?.cnt ?? 0);
    await tursoClient.execute({
      sql: `DELETE FROM ${table} WHERE id IN (${placeholders})`,
      args: ids,
    });
    return actualCount;
  }
  // Fallback: parallel deletes with count
  const results = await Promise.allSettled(
    ids.map((id: string) => db[table === 'Shift' ? 'shift' : 'paymentRecord'].delete({ where: { id } }))
  );
  return results.filter(r => r.status === 'fulfilled').length;
}

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

    // IMP-013: Validate importId format
    if (!importId || typeof importId !== 'string' || importId.length < 10 || importId.length > 100) {
      return NextResponse.json({ error: 'Invalid import ID' }, { status: 400 });
    }

    const importEntry = await db.importLog.findUnique({ where: { id: importId } });
    if (!importEntry) {
      return NextResponse.json({ error: 'Import record not found' }, { status: 404 });
    }

    if (importEntry.userId !== user.id) {
      return NextResponse.json({ error: 'You can only reverse your own imports' }, { status: 403 });
    }

    if (importEntry.reversed) {
      return NextResponse.json({ error: 'This import has already been reversed' }, { status: 400 });
    }

    // IMP-026: Atomic check-and-update to prevent double-reverse race condition
    const { getTursoClientIfAvailable } = await import('@/lib/db');
    const tursoClient = getTursoClientIfAvailable();

    if (tursoClient) {
      // Try atomic UPDATE ... WHERE reversed = 0 first
      try {
        const atomicUpdate = await tursoClient.execute({
          sql: 'UPDATE ImportLog SET reversed = 1, reversedAt = ? WHERE id = ? AND reversed = 0',
          args: [new Date().toISOString(), importId],
        });
        // If no rows affected, another request already reversed it
        if (atomicUpdate.rowsAffected === 0) {
          return NextResponse.json({ error: 'This import has already been reversed' }, { status: 400 });
        }
      } catch {
        // If atomic update fails (e.g. column type mismatch), fall through to normal flow
      }
    }

    const results = {
      shiftsDeleted: 0,
      paymentsDeleted: 0,
      companiesDeleted: 0,
      errors: [] as string[],
    };

    // IMP-011: Accurate delete counts
    results.shiftsDeleted = await batchDeleteWithCount(tursoClient, importEntry.shiftIds || [], 'Shift');
    results.paymentsDeleted = await batchDeleteWithCount(tursoClient, importEntry.paymentIds || [], 'PaymentRecord');

    // IMP-006: Batch company check — single query instead of N sequential count() calls
    const emptyCompanyIds = await findEmptyCompanyIds(tursoClient, importEntry.companyIds || []);
    for (const companyId of emptyCompanyIds) {
      try {
        await db.company.delete({ where: { id: companyId } });
        results.companiesDeleted++;
      } catch (e) {
        console.warn(`[IMPORT REVERSE] Company ${companyId} not found or already deleted`);
      }
    }

    await db.importLog.update({
      where: { id: importId },
      data: { reversed: true, reversedAt: new Date() },
    });

    // IMP-016: Use userId instead of email
    console.log(`[IMPORT REVERSE] User ${user.id} reversed import ${importId}: ${results.shiftsDeleted} shifts, ${results.paymentsDeleted} payments, ${results.companiesDeleted} companies deleted`);

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
