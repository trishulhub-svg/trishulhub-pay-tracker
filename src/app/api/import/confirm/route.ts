import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/session';

// Allow up to 60s for large imports on Vercel
export const maxDuration = 60;

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
            data: { name, userId: user.id, payRate: 0 },
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

    // Fallback: if user has companies, pick the first one for unmatched shifts/payments
    const fallbackCompanyId = companyMap.size > 0
      ? [...companyMap.values()][0]
      : null;

    // ─── Batch import shifts ───
    if (shifts && Array.isArray(shifts) && shifts.length > 0) {
      // Pre-validate: pair each valid shift with its pre-generated ID
      const validShifts: { id: string; src: any }[] = [];
      for (const shift of shifts) {
        const companyId = shift.companyId || (shift.companyName ? companyMap.get(shift.companyName.toLowerCase()) : null) || fallbackCompanyId;
        if (!companyId) {
          results.errors.push(`Shift on ${shift.date}: No matching company — you have no companies yet. Please create a company first.`);
          continue;
        }
        validShifts.push({
          id: 'c' + Date.now().toString(36) + Math.random().toString(36).substring(2, 8) + Math.random().toString(36).substring(2, 6),
          src: { ...shift, _resolvedCompanyId: companyId },
        });
      }

      if (validShifts.length > 0) {
        try {
          const now = new Date().toISOString();
          const placeholders = validShifts.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
          const values: any[] = [];

          for (const { id, src } of validShifts) {
            values.push(
              id,
              user.id,
              src._resolvedCompanyId,
              src.date,
              src.startTime || '09:00',
              src.endTime || '17:00',
              src.breakMinutes || 0,
              src.totalHours || 0,
              src.shiftType || 'REGULAR',
              src.payRate || 0,
              src.notes || null,
              src.client || null,
              now,
              now,
            );
          }

          const { getTursoClientIfAvailable } = await import('@/lib/db');
          const tursoClient = getTursoClientIfAvailable();

          if (tursoClient) {
            // Turso: single batch INSERT — reduces N round-trips to 1
            await tursoClient.execute({
              sql: `INSERT INTO Shift (id, userId, companyId, date, startTime, endTime, breakMinutes, totalHours, shiftType, payRate, notes, client, createdAt, updatedAt)
                    VALUES ${placeholders}`,
              args: values,
            });
          } else {
            // Local SQLite: parallel ORM creates
            await Promise.all(validShifts.map(({ src }) =>
              db.shift.create({
                data: {
                  userId: user.id,
                  companyId: src._resolvedCompanyId,
                  date: src.date,
                  startTime: src.startTime || '09:00',
                  endTime: src.endTime || '17:00',
                  breakMinutes: src.breakMinutes || 0,
                  totalHours: src.totalHours || 0,
                  shiftType: src.shiftType || 'REGULAR',
                  payRate: src.payRate || 0,
                  notes: src.notes || null,
                  client: src.client || null,
                },
              }).catch(() => {}),
            ));
          }

          for (const { id } of validShifts) {
            createdShiftIds.push(id);
          }
          results.shiftsCreated += validShifts.length;
        } catch (e) {
          console.error('[IMPORT] Batch shift insert failed, falling back to sequential:', e);
          // Graceful fallback to sequential
          for (const { src } of validShifts) {
            try {
              const created = await db.shift.create({
                data: {
                  userId: user.id,
                  companyId: src._resolvedCompanyId,
                  date: src.date,
                  startTime: src.startTime || '09:00',
                  endTime: src.endTime || '17:00',
                  breakMinutes: src.breakMinutes || 0,
                  totalHours: src.totalHours || 0,
                  shiftType: src.shiftType || 'REGULAR',
                  payRate: src.payRate || 0,
                  notes: src.notes || null,
                  client: src.client || null,
                },
              });
              createdShiftIds.push(created.id);
              results.shiftsCreated++;
            } catch (err) {
              results.errors.push(`Shift on ${src.date}: ${err instanceof Error ? err.message : 'Failed to create'}`);
            }
          }
        }
      }
    }

    // ─── Batch import payment records ───
    if (payments && Array.isArray(payments) && payments.length > 0) {
      const validPayments: { id: string; src: any }[] = [];
      for (const payment of payments) {
        const companyId = payment.companyId || (payment.companyName ? companyMap.get(payment.companyName.toLowerCase()) : null) || fallbackCompanyId;
        if (!companyId) {
          results.errors.push(`Payment ${payment.month}/${payment.year}: No matching company — you have no companies yet. Please create a company first.`);
          continue;
        }
        validPayments.push({
          id: 'c' + Date.now().toString(36) + Math.random().toString(36).substring(2, 8) + Math.random().toString(36).substring(2, 6),
          src: { ...payment, _resolvedCompanyId: companyId, _resolvedMonth: payment.month || new Date().getMonth() + 1, _resolvedYear: payment.year || new Date().getFullYear() },
        });
      }

      if (validPayments.length > 0) {
        try {
          const now = new Date().toISOString();
          const placeholders = validPayments.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
          const values: any[] = [];

          for (const { id, src } of validPayments) {
            values.push(
              id,
              user.id,
              src._resolvedCompanyId,
              src._resolvedMonth,
              src._resolvedYear,
              src.totalExpected || 0,
              src.totalReceived || 0,
              src.totalHMRC || 0,
              src.totalDue || 0,
              src.workedHours || 0,
              'PENDING',
              src.notes || null,
              now,
              now,
            );
          }

          const { getTursoClientIfAvailable } = await import('@/lib/db');
          const tursoClient = getTursoClientIfAvailable();

          if (tursoClient) {
            await tursoClient.execute({
              sql: `INSERT INTO PaymentRecord (id, userId, companyId, month, year, totalExpected, totalReceived, totalHMRC, totalDue, workedHours, status, notes, createdAt, updatedAt)
                    VALUES ${placeholders}`,
              args: values,
            });
          } else {
            await Promise.all(validPayments.map(({ src }) =>
              db.paymentRecord.create({
                data: {
                  userId: user.id,
                  companyId: src._resolvedCompanyId,
                  month: src._resolvedMonth,
                  year: src._resolvedYear,
                  totalExpected: src.totalExpected || 0,
                  totalReceived: src.totalReceived || 0,
                  totalHMRC: src.totalHMRC || 0,
                  totalDue: src.totalDue || 0,
                  workedHours: src.workedHours || 0,
                  status: 'PENDING',
                  notes: src.notes || null,
                },
              }).catch(() => {}),
            ));
          }

          for (const { id } of validPayments) {
            createdPaymentIds.push(id);
          }
          results.paymentsCreated += validPayments.length;
        } catch (e) {
          console.error('[IMPORT] Batch payment insert failed, falling back to sequential:', e);
          for (const { src } of validPayments) {
            try {
              const created = await db.paymentRecord.create({
                data: {
                  userId: user.id,
                  companyId: src._resolvedCompanyId,
                  month: src._resolvedMonth,
                  year: src._resolvedYear,
                  totalExpected: src.totalExpected || 0,
                  totalReceived: src.totalReceived || 0,
                  totalHMRC: src.totalHMRC || 0,
                  totalDue: src.totalDue || 0,
                  workedHours: src.workedHours || 0,
                  status: 'PENDING',
                  notes: src.notes || null,
                },
              });
              createdPaymentIds.push(created.id);
              results.paymentsCreated++;
            } catch (err) {
              results.errors.push(`Payment ${src._resolvedMonth}/${src._resolvedYear}: ${err instanceof Error ? err.message : 'Failed to create'}`);
            }
          }
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
