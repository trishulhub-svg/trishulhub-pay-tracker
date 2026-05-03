import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/session';

// POST /api/import/confirm — Save imported data after user review
export async function POST(request: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (!user.isPremium) {
      return NextResponse.json({ error: 'Premium access required for data import' }, { status: 403 });
    }

    const body = await request.json();
    const { shifts, payments, createCompanies, fileName, fileType, importType } = body as {
      shifts: any[];
      payments: any[];
      createCompanies: boolean;
      fileName?: string;
      fileType?: string;
      importType?: string;
    };

    if (!shifts && !payments) {
      return NextResponse.json({ error: 'No data to import' }, { status: 400 });
    }

    const results = {
      shiftsCreated: 0,
      paymentsCreated: 0,
      companiesCreated: 0,
      errors: [] as string[],
      importId: '' as string,
    };

    // Track IDs of created items for the import log
    const createdShiftIds: string[] = [];
    const createdPaymentIds: string[] = [];
    const createdCompanyIds: string[] = [];

    // Get user's current companies
    const existingCompanies = await db.company.findMany({ where: { userId: user.id } });
    const companyMap = new Map<string, string>();
    for (const c of existingCompanies) {
      companyMap.set(c.name.toLowerCase(), c.id);
    }

    // Create new companies if needed and requested
    const allCompanyNames = new Set<string>();
    if (shifts) shifts.forEach((s: any) => { if (s.companyName) allCompanyNames.add(s.companyName); });
    if (payments) payments.forEach((p: any) => { if (p.companyName) allCompanyNames.add(p.companyName); });

    for (const name of allCompanyNames) {
      const existingId = companyMap.get(name.toLowerCase());
      if (existingId) continue;

      if (createCompanies) {
        try {
          const newCompany = await db.company.create({
            data: {
              name,
              userId: user.id,
              payRate: 0,
            },
          });
          companyMap.set(name.toLowerCase(), newCompany.id);
          createdCompanyIds.push(newCompany.id);
          results.companiesCreated++;
        } catch (e) {
          results.errors.push(`Failed to create company "${name}": ${e instanceof Error ? e.message : 'Unknown error'}`);
        }
      } else {
        results.errors.push(`Company "${name}" not found. Enable "Create new companies" to auto-create.`);
      }
    }

    // Import shifts
    if (shifts && Array.isArray(shifts)) {
      for (const shift of shifts) {
        try {
          const companyId = shift.companyId || (shift.companyName ? companyMap.get(shift.companyName.toLowerCase()) : null);
          if (!companyId) {
            results.errors.push(`Shift on ${shift.date}: No matching company`);
            continue;
          }

          const created = await db.shift.create({
            data: {
              userId: user.id,
              companyId,
              date: shift.date,
              startTime: shift.startTime || '09:00',
              endTime: shift.endTime || '17:00',
              breakMinutes: shift.breakMinutes || 0,
              totalHours: shift.totalHours || 0,
              shiftType: shift.shiftType || 'REGULAR',
              payRate: shift.payRate || 0,
              notes: shift.notes || null,
              client: shift.client || null,
            },
          });
          createdShiftIds.push(created.id);
          results.shiftsCreated++;
        } catch (e) {
          results.errors.push(`Shift on ${shift.date}: ${e instanceof Error ? e.message : 'Failed to create'}`);
        }
      }
    }

    // Import payment records
    if (payments && Array.isArray(payments)) {
      for (const payment of payments) {
        try {
          const companyId = payment.companyId || (payment.companyName ? companyMap.get(payment.companyName.toLowerCase()) : null);
          if (!companyId) {
            results.errors.push(`Payment ${payment.month}/${payment.year}: No matching company`);
            continue;
          }

          const created = await db.paymentRecord.create({
            data: {
              userId: user.id,
              companyId,
              month: payment.month || new Date().getMonth() + 1,
              year: payment.year || new Date().getFullYear(),
              totalExpected: payment.totalExpected || 0,
              totalReceived: payment.totalReceived || 0,
              totalHMRC: payment.totalHMRC || 0,
              totalDue: payment.totalDue || 0,
              workedHours: payment.workedHours || 0,
              status: 'PENDING',
              notes: payment.notes || null,
            },
          });
          createdPaymentIds.push(created.id);
          results.paymentsCreated++;
        } catch (e) {
          results.errors.push(`Payment ${payment.month}/${payment.year}: ${e instanceof Error ? e.message : 'Failed to create'}`);
        }
      }
    }

    // Create an import log entry
    try {
      const importLogEntry = await db.importLog.create({
        data: {
          userId: user.id,
          fileName: fileName || null,
          fileType: fileType || null,
          importType: importType || 'auto',
          shiftsCount: results.shiftsCreated,
          paymentsCount: results.paymentsCreated,
          companiesCreated: results.companiesCreated,
          shiftIds: createdShiftIds,
          paymentIds: createdPaymentIds,
          companyIds: createdCompanyIds,
          reversed: false,
        },
      });
      results.importId = importLogEntry.id;
    } catch (logErr) {
      // Import log creation failure should not block the import itself
      console.error('[IMPORT] Failed to create import log:', logErr);
    }

    console.log(`[IMPORT] User ${user.email} imported ${results.shiftsCreated} shifts, ${results.paymentsCreated} payments, ${results.companiesCreated} companies (log: ${results.importId})`);

    return NextResponse.json({
      success: true,
      results,
    });
  } catch (error) {
    console.error('Import confirm error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save imported data' },
      { status: 500 }
    );
  }
}
