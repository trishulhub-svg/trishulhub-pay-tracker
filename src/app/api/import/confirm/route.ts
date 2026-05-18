import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/session';
import { calcTotalHours } from '@/lib/import-utils';

// Allow up to 60s for large imports on Vercel
export const maxDuration = 60;

// Generate collision-free unique IDs
function generateUniqueId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'c' + Date.now().toString(36) + Math.random().toString(36).substring(2, 8) + Math.random().toString(36).substring(2, 6);
}

// IMP-018: Validate and sanitize shift fields before DB insert
function validateShift(s: any): { valid: boolean; date?: string; errors: string[] } {
  const errors: string[] = [];
  if (!s.date || typeof s.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s.date)) {
    errors.push(`Invalid date "${s.date}" — must be YYYY-MM-DD`);
  }
  if (s.shiftType && !['REGULAR', 'OVERTIME', 'HOLIDAY', 'SICK', 'UNPAID', 'ON_CALL'].includes(s.shiftType)) {
    errors.push(`Invalid shiftType "${s.shiftType}" — using REGULAR`);
  }
  if (s.totalHours != null && (typeof s.totalHours !== 'number' || !Number.isFinite(s.totalHours) || s.totalHours < 0 || s.totalHours > 24)) {
    errors.push(`Invalid totalHours ${s.totalHours} — clamping to 0-24`);
  }
  if (s.payRate != null && (typeof s.payRate !== 'number' || !Number.isFinite(s.payRate) || s.payRate < 0)) {
    errors.push(`Invalid payRate ${s.payRate} — using 0`);
  }
  if (s.breakMinutes != null && (typeof s.breakMinutes !== 'number' || !Number.isFinite(s.breakMinutes) || s.breakMinutes < 0)) {
    errors.push(`Invalid breakMinutes ${s.breakMinutes} — using 0`);
  }
  if (s.notes != null && typeof s.notes !== 'string') {
    errors.push(`Invalid notes type — using null`);
  }
  return { valid: errors.length === 0, date: s.date, errors };
}

// IMP-018: Validate and sanitize payment fields before DB insert
function validatePayment(p: any): { valid: boolean; label?: string; errors: string[] } {
  const errors: string[] = [];
  const label = `${p.month || '?'}/${p.year || '?'}`;
  if (p.month != null && (typeof p.month !== 'number' || !Number.isFinite(p.month) || p.month < 1 || p.month > 12)) {
    errors.push(`Payment ${label}: Invalid month ${p.month} — must be 1-12`);
  }
  if (p.year != null && (typeof p.year !== 'number' || !Number.isFinite(p.year) || p.year < 2000 || p.year > 2100)) {
    errors.push(`Payment ${label}: Invalid year ${p.year} — must be 2000-2100`);
  }
  for (const field of ['totalExpected', 'totalReceived', 'totalHMRC', 'totalDue', 'workedHours'] as const) {
    if (p[field] != null && (typeof p[field] !== 'number' || !Number.isFinite(p[field]) || p[field] < 0)) {
      errors.push(`Payment ${label}: Invalid ${field} ${p[field]} — using 0`);
    }
  }
  if (p.notes != null && typeof p.notes !== 'string') {
    errors.push(`Payment ${label}: Invalid notes type — using null`);
  }
  return { valid: errors.length === 0, label, errors };
}

// Verify batch-inserted rows actually exist in DB
async function verifyInsertedIds(tursoClient: any, ids: string[], table: string): Promise<string[]> {
  if (ids.length === 0) return [];
  try {
    const placeholders = ids.map(() => '?').join(', ');
    const result = await tursoClient.execute({
      sql: `SELECT id FROM ${table} WHERE id IN (${placeholders})`,
      args: ids,
    });
    const foundIds = new Set(result.rows.map((r: any) => r.id));
    return ids.filter(id => foundIds.has(id));
  } catch {
    return ids;
  }
}

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
      shiftsSkipped: 0,
      paymentsCreated: 0,
      paymentsSkipped: 0,
      companiesCreated: 0,
      errors: [] as string[],
      importId: '' as string,
    };

    const createdShiftIds: string[] = [];
    const createdPaymentIds: string[] = [];
    const createdCompanyIds: string[] = [];

    // Import getTursoClientIfAvailable once at the top
    const { getTursoClientIfAvailable } = await import('@/lib/db');
    const tursoClient = getTursoClientIfAvailable();

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

    // ─── IMP-001: Efficient dedup — only fetch keys we need, not full rows ───
    const existingShiftKeys = new Set<string>();
    if (tursoClient && shifts && shifts.length > 0) {
      // Direct SQL: only select date, companyId, shiftType — not the full row
      try {
        const r = await tursoClient.execute({
          sql: 'SELECT companyId, date, shiftType FROM Shift WHERE userId = ?',
          args: [user.id],
        });
        for (const row of r.rows) {
          existingShiftKeys.add(`${user.id}:${row.companyId}:${row.date}:${row.shiftType || 'REGULAR'}`);
        }
      } catch {
        // Fallback to ORM if direct SQL fails
        const existingShifts = await db.shift.findMany({ where: { userId: user.id } });
        for (const s of existingShifts) {
          existingShiftKeys.add(`${s.userId}:${s.companyId}:${s.date}:${s.shiftType || 'REGULAR'}`);
        }
      }
    } else if (shifts && shifts.length > 0) {
      const existingShifts = await db.shift.findMany({ where: { userId: user.id } });
      for (const s of existingShifts) {
        existingShiftKeys.add(`${s.userId}:${s.companyId}:${s.date}:${s.shiftType || 'REGULAR'}`);
      }
    }

    // ─── Efficient payment dedup ───
    const existingPaymentKeys = new Set<string>();
    if (tursoClient && payments && payments.length > 0) {
      try {
        const r = await tursoClient.execute({
          sql: 'SELECT companyId, month, year FROM PaymentRecord WHERE userId = ?',
          args: [user.id],
        });
        for (const row of r.rows) {
          existingPaymentKeys.add(`${user.id}:${row.companyId}:${row.month}:${row.year}`);
        }
      } catch {
        const existingPayments = await db.paymentRecord.findMany({ where: { userId: user.id } });
        for (const p of existingPayments) {
          existingPaymentKeys.add(`${p.userId}:${p.companyId}:${p.month}:${p.year}`);
        }
      }
    } else if (payments && payments.length > 0) {
      const existingPayments = await db.paymentRecord.findMany({ where: { userId: user.id } });
      for (const p of existingPayments) {
        existingPaymentKeys.add(`${p.userId}:${p.companyId}:${p.month}:${p.year}`);
      }
    }

    // ─── Batch import shifts ───
    if (shifts && Array.isArray(shifts) && shifts.length > 0) {
      const validShifts: { id: string; src: any }[] = [];

      for (const shift of shifts) {
        // IMP-018: Validate each shift before processing
        const validation = validateShift(shift);
        if (!validation.valid) {
          results.errors.push(...validation.errors);
        }
        // Reject shifts with completely invalid dates (can't dedup without a date)
        if (!shift.date || typeof shift.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(shift.date)) {
          continue;
        }

        const companyId = shift.companyId || (shift.companyName ? companyMap.get(shift.companyName.toLowerCase()) : null) || fallbackCompanyId;
        if (!companyId) {
          results.errors.push(`Shift on ${shift.date}: No matching company — you have no companies yet. Please create a company first.`);
          continue;
        }

        // IMP-005: Dedup key now includes shiftType — allows split shifts on same day
        const shiftType = ['REGULAR', 'OVERTIME', 'HOLIDAY', 'SICK', 'UNPAID', 'ON_CALL'].includes(shift.shiftType) ? shift.shiftType : 'REGULAR';
        const dedupKey = `${user.id}:${companyId}:${shift.date}:${shiftType}`;
        if (existingShiftKeys.has(dedupKey)) {
          results.shiftsSkipped++;
          continue;
        }

        // IMP-012: Use shared calcTotalHours from lib/import-utils
        // IMP-018: Clamp totalHours to 0-24
        let totalHours = (typeof shift.totalHours === 'number' && Number.isFinite(shift.totalHours))
          ? Math.max(0, Math.min(24, shift.totalHours))
          : 0;
        if (!totalHours && shift.startTime && shift.endTime) {
          totalHours = calcTotalHours(shift.startTime, shift.endTime, shift.breakMinutes || 0);
        }

        validShifts.push({
          id: generateUniqueId(),
          src: {
            ...shift,
            _resolvedCompanyId: companyId,
            _resolvedTotalHours: totalHours,
            _resolvedShiftType: shiftType,
            // IMP-018: Sanitize fields for DB insert
            _payRate: (typeof shift.payRate === 'number' && Number.isFinite(shift.payRate) && shift.payRate >= 0) ? shift.payRate : 0,
            _breakMinutes: (typeof shift.breakMinutes === 'number' && Number.isFinite(shift.breakMinutes) && shift.breakMinutes >= 0) ? Math.round(shift.breakMinutes) : 0,
            _notes: typeof shift.notes === 'string' ? shift.notes : null,
          },
        });
      }

      if (validShifts.length > 0) {
        try {
          const now = new Date().toISOString();
          const placeholders = validShifts.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
          const values: any[] = [];

          for (const { id, src } of validShifts) {
            values.push(
              id, user.id, src._resolvedCompanyId, src.date,
              src.startTime || '09:00', src.endTime || '17:00',
              src._breakMinutes, src._resolvedTotalHours,
              src._resolvedShiftType, src._payRate,
              src._notes, src.client || null, now, now,
            );
          }

          if (tursoClient) {
            await tursoClient.execute({
              sql: `INSERT INTO Shift (id, userId, companyId, date, startTime, endTime, breakMinutes, totalHours, shiftType, payRate, notes, client, createdAt, updatedAt)
                    VALUES ${placeholders}`,
              args: values,
            });

            const verifiedIds = await verifyInsertedIds(tursoClient, validShifts.map(v => v.id), 'Shift');
            if (verifiedIds.length < validShifts.length) {
              const missing = validShifts.length - verifiedIds.length;
              results.errors.push(`${missing} shift(s) failed to insert silently during batch operation.`);
            }
            verifiedIds.forEach(id => createdShiftIds.push(id));
            results.shiftsCreated += verifiedIds.length;
          } else {
            const created = await Promise.allSettled(validShifts.map(({ src }) =>
              db.shift.create({
                data: {
                  userId: user.id, companyId: src._resolvedCompanyId,
                  date: src.date, startTime: src.startTime || '09:00',
                  endTime: src.endTime || '17:00', breakMinutes: src._breakMinutes,
                  totalHours: src._resolvedTotalHours, shiftType: src._resolvedShiftType,
                  payRate: src._payRate, notes: src._notes, client: src.client || null,
                },
              })
            ));
            created.forEach((r, i) => {
              if (r.status === 'fulfilled') {
                createdShiftIds.push(r.value.id);
                results.shiftsCreated++;
              } else {
                results.errors.push(`Shift on ${validShifts[i].src.date}: ${r.reason instanceof Error ? r.reason.message : 'Failed to create'}`);
              }
            });
          }
        } catch (e) {
          console.error('[IMPORT] Batch shift insert failed, falling back to sequential:', e);
          for (const { id, src } of validShifts) {
            try {
              const created = await db.shift.create({
                data: {
                  userId: user.id, companyId: src._resolvedCompanyId,
                  date: src.date, startTime: src.startTime || '09:00',
                  endTime: src.endTime || '17:00', breakMinutes: src._breakMinutes,
                  totalHours: src._resolvedTotalHours, shiftType: src._resolvedShiftType,
                  payRate: src._payRate, notes: src._notes, client: src.client || null,
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
        // IMP-018: Validate each payment before processing
        const pValidation = validatePayment(payment);
        if (!pValidation.valid) {
          results.errors.push(...pValidation.errors);
        }

        const companyId = payment.companyId || (payment.companyName ? companyMap.get(payment.companyName.toLowerCase()) : null) || fallbackCompanyId;
        if (!companyId) {
          results.errors.push(`Payment ${payment.month}/${payment.year}: No matching company — you have no companies yet. Please create a company first.`);
          continue;
        }

        // IMP-018: Clamp and validate month/year
        const month = (typeof payment.month === 'number' && Number.isFinite(payment.month) && payment.month >= 1 && payment.month <= 12)
          ? Math.round(payment.month)
          : new Date().getMonth() + 1;
        const year = (typeof payment.year === 'number' && Number.isFinite(payment.year) && payment.year >= 2000 && payment.year <= 2100)
          ? Math.round(payment.year)
          : new Date().getFullYear();
        const dedupKey = `${user.id}:${companyId}:${month}:${year}`;
        if (existingPaymentKeys.has(dedupKey)) {
          results.paymentsSkipped++;
          continue;
        }

        // IMP-018: Sanitize numeric fields
        const safeNum = (v: any, max: number) => (typeof v === 'number' && Number.isFinite(v) && v >= 0) ? Math.round(v * 100) / 100 : 0;
        const safeHours = (v: any) => (typeof v === 'number' && Number.isFinite(v) && v >= 0) ? Math.round(v * 100) / 100 : 0;

        validPayments.push({
          id: generateUniqueId(),
          src: {
            ...payment,
            _resolvedCompanyId: companyId, _resolvedMonth: month, _resolvedYear: year,
            _totalExpected: safeNum(payment.totalExpected, Infinity),
            _totalReceived: safeNum(payment.totalReceived, Infinity),
            _totalHMRC: safeNum(payment.totalHMRC, Infinity),
            _totalDue: safeNum(payment.totalDue, Infinity),
            _workedHours: safeHours(payment.workedHours),
            _notes: typeof payment.notes === 'string' ? payment.notes : null,
          },
        });
      }

      if (validPayments.length > 0) {
        try {
          const now = new Date().toISOString();
          const placeholders = validPayments.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
          const values: any[] = [];

          for (const { id, src } of validPayments) {
            values.push(
              id, user.id, src._resolvedCompanyId, src._resolvedMonth, src._resolvedYear,
              src._totalExpected, src._totalReceived, src._totalHMRC,
              src._totalDue, src._workedHours, 'PENDING',
              src._notes, now, now,
            );
          }

          if (tursoClient) {
            await tursoClient.execute({
              sql: `INSERT INTO PaymentRecord (id, userId, companyId, month, year, totalExpected, totalReceived, totalHMRC, totalDue, workedHours, status, notes, createdAt, updatedAt)
                    VALUES ${placeholders}`,
              args: values,
            });

            const verifiedIds = await verifyInsertedIds(tursoClient, validPayments.map(v => v.id), 'PaymentRecord');
            if (verifiedIds.length < validPayments.length) {
              const missing = validPayments.length - verifiedIds.length;
              results.errors.push(`${missing} payment(s) failed to insert silently during batch operation.`);
            }
            verifiedIds.forEach(id => createdPaymentIds.push(id));
            results.paymentsCreated += verifiedIds.length;
          } else {
            const created = await Promise.allSettled(validPayments.map(({ src }) =>
              db.paymentRecord.create({
                data: {
                  userId: user.id, companyId: src._resolvedCompanyId,
                  month: src._resolvedMonth, year: src._resolvedYear,
                  totalExpected: src._totalExpected, totalReceived: src._totalReceived,
                  totalHMRC: src._totalHMRC, totalDue: src._totalDue,
                  workedHours: src._workedHours, status: 'PENDING',
                  notes: src._notes,
                },
              })
            ));
            created.forEach((r, i) => {
              if (r.status === 'fulfilled') {
                createdPaymentIds.push(r.value.id);
                results.paymentsCreated++;
              } else {
                results.errors.push(`Payment ${validPayments[i].src._resolvedMonth}/${validPayments[i].src._resolvedYear}: ${r.reason instanceof Error ? r.reason.message : 'Failed to create'}`);
              }
            });
          }
        } catch (e) {
          console.error('[IMPORT] Batch payment insert failed, falling back to sequential:', e);
          for (const { id, src } of validPayments) {
            try {
              const created = await db.paymentRecord.create({
                data: {
                  userId: user.id, companyId: src._resolvedCompanyId,
                  month: src._resolvedMonth, year: src._resolvedYear,
                  totalExpected: src._totalExpected, totalReceived: src._totalReceived,
                  totalHMRC: src._totalHMRC, totalDue: src._totalDue,
                  workedHours: src._workedHours, status: 'PENDING',
                  notes: src._notes,
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

    const msgParts = [
      `${results.shiftsCreated} shifts`,
      results.shiftsSkipped > 0 ? `${results.shiftsSkipped} skipped` : null,
      `${results.paymentsCreated} payments`,
      results.paymentsSkipped > 0 ? `${results.paymentsSkipped} skipped` : null,
      `${results.companiesCreated} companies`,
    ].filter(Boolean).join(', ');

    // IMP-014: Use userId instead of email in logs
    console.log(`[IMPORT] User ${user.id} imported ${msgParts} (log: ${results.importId})`);

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
