import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/session';

// Allow up to 60s for cascade deletes on Vercel
export const maxDuration = 60;

// IMP-006: Batch-find empty companies in one query
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
  const empty: string[] = [];
  for (const companyId of companyIds) {
    const rs = await db.shift.count({ where: { companyId } });
    const rp = await db.paymentRecord.count({ where: { companyId } });
    if (rs === 0 && rp === 0) empty.push(companyId);
  }
  return empty;
}

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

    // IMP-013: Validate ID format
    if (!id || typeof id !== 'string' || id.length < 10 || id.length > 100) {
      return NextResponse.json({ error: 'Invalid import ID' }, { status: 400 });
    }

    const importEntry = await db.importLog.findUnique({ where: { id } });
    if (!importEntry) {
      return NextResponse.json({ error: 'Import record not found' }, { status: 404 });
    }

    if (importEntry.userId !== user.id) {
      return NextResponse.json({ error: 'You can only delete your own import history' }, { status: 403 });
    }

    // If the import is not reversed, also delete the associated data
    let cascadeErrors = 0;
    if (!importEntry.reversed) {
      const { getTursoClientIfAvailable } = await import('@/lib/db');
      const tursoClient = getTursoClientIfAvailable();

      if (importEntry.shiftIds && importEntry.shiftIds.length > 0) {
        if (tursoClient) {
          const placeholders = importEntry.shiftIds.map(() => '?').join(', ');
          try { await tursoClient.execute({ sql: `DELETE FROM Shift WHERE id IN (${placeholders})`, args: importEntry.shiftIds }); } catch (e) { console.warn('[IMPORT DELETE] Cascade shift delete failed:', e); cascadeErrors++; }
        } else {
          const results = await Promise.allSettled(importEntry.shiftIds.map((sid: string) => db.shift.delete({ where: { id: sid } })));
          cascadeErrors += results.filter(r => r.status === 'rejected').length;
        }
      }

      if (importEntry.paymentIds && importEntry.paymentIds.length > 0) {
        if (tursoClient) {
          const placeholders = importEntry.paymentIds.map(() => '?').join(', ');
          try { await tursoClient.execute({ sql: `DELETE FROM PaymentRecord WHERE id IN (${placeholders})`, args: importEntry.paymentIds }); } catch (e) { console.warn('[IMPORT DELETE] Cascade payment delete failed:', e); cascadeErrors++; }
        } else {
          const results = await Promise.allSettled(importEntry.paymentIds.map((pid: string) => db.paymentRecord.delete({ where: { id: pid } })));
          cascadeErrors += results.filter(r => r.status === 'rejected').length;
        }
      }

      // IMP-006: Batch company empty check
      const emptyCompanyIds = await findEmptyCompanyIds(tursoClient, importEntry.companyIds || []);
      for (const companyId of emptyCompanyIds) {
        try { await db.company.delete({ where: { id: companyId } }); } catch (e) { console.warn(`[IMPORT DELETE] Company ${companyId} delete failed:`, e); cascadeErrors++; }
      }
    }

    await db.importLog.delete({ where: { id } });

    return NextResponse.json({
      success: true,
      message: cascadeErrors > 0
        ? `Import history deleted, but ${cascadeErrors} cascade deletion(s) failed. Some orphaned data may remain.`
        : 'Import history deleted successfully.',
    });
  } catch (error) {
    console.error('Import log delete error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete import history' },
      { status: 500 }
    );
  }
}
