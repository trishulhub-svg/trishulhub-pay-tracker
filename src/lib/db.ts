import { createClient, type Client } from '@libsql/client'

// ============================================================
// IMPORTANT: PrismaClient is NOT imported at the top level.
// It's loaded lazily via require() only when running local dev
// with SQLite. This prevents Prisma from trying to connect
// or validate DATABASE_URL on Vercel where only Turso is used.
// ============================================================

const globalForPrisma = globalThis as unknown as {
  prisma: any | undefined
}

// ============================================================
// Turso (libSQL) client for production — SINGLETON with connection pooling
// ============================================================

let _tursoClient: Client | null = null;
let _indexesCreated = false;

function getTursoClient(): Client {
  if (_tursoClient) return _tursoClient;

  const url = process.env.TURSO_DATABASE_URL
  const authToken = process.env.TURSO_AUTH_TOKEN

  if (!url || url === 'undefined') {
    throw new Error('[DB] TURSO_DATABASE_URL is not set or is invalid. Please set it in your Vercel environment variables.')
  }
  if (!authToken || authToken === 'undefined') {
    throw new Error('[DB] TURSO_AUTH_TOKEN is not set or invalid. Please set it in your Vercel environment variables.')
  }

  _tursoClient = createClient({
    url,
    authToken,
    // Enable connection pooling for better performance on serverless
  });

  // REC-012 + SHI-011: Create performance indexes on first connection (idempotent — IF NOT EXISTS)
  if (!_indexesCreated) {
    _indexesCreated = true;
    _tursoClient.execute({ sql: 'CREATE INDEX IF NOT EXISTS idx_pr_userId ON PaymentRecord(userId)', args: [] }).catch(() => {});
    _tursoClient.execute({ sql: 'CREATE INDEX IF NOT EXISTS idx_pr_userId_status ON PaymentRecord(userId, status)', args: [] }).catch(() => {});
    _tursoClient.execute({ sql: 'CREATE INDEX IF NOT EXISTS idx_shift_userId ON Shift(userId)', args: [] }).catch(() => {});
    _tursoClient.execute({ sql: 'CREATE INDEX IF NOT EXISTS idx_shift_userId_date ON Shift(userId, date)', args: [] }).catch(() => {});
    _tursoClient.execute({ sql: 'CREATE INDEX IF NOT EXISTS idx_shift_userId_companyId_date ON Shift(userId, companyId, date)', args: [] }).catch(() => {});
    _tursoClient.execute({ sql: 'CREATE INDEX IF NOT EXISTS idx_company_userId ON Company(userId)', args: [] }).catch(() => {});
    _tursoClient.execute({ sql: 'CREATE INDEX IF NOT EXISTS idx_user_referredBy ON User(referredBy)', args: [] }).catch(() => {});
    // REF-019: Add referredById column for direct joins (idempotent migration)
    _tursoClient.execute({ sql: `ALTER TABLE User ADD COLUMN referredById TEXT`, args: [] }).catch(() => { /* column may already exist */ });
    // REF-019: Backfill referredById from existing referredBy codes
    _tursoClient.execute({
      sql: `UPDATE User SET referredById = (SELECT r.id FROM User r WHERE r.referralCode = User.referredBy) WHERE referredBy IS NOT NULL AND referredById IS NULL`,
      args: [],
    }).catch(() => {});
    _tursoClient.execute({ sql: 'CREATE INDEX IF NOT EXISTS idx_user_referredById ON User(referredById)', args: [] }).catch(() => {});
  }

  return _tursoClient;
}

// Export for use in optimized queries (e.g., GROUP BY instead of N+1)
export function getTursoClientIfAvailable(): Client | null {
  if (useTurso()) return getTursoClient();
  return null;
}

// Check if we should use Turso (production on Vercel)
function useTurso(): boolean {
  const url = process.env.TURSO_DATABASE_URL
  const token = process.env.TURSO_AUTH_TOKEN
  return !!(url && token && url !== 'undefined' && token !== 'undefined' && url.startsWith('libsql://'))
}

// ============================================================
// Local SQLite (Prisma) for development - LAZY LOADED
// Only loaded when NOT using Turso (i.e., local development)
// ============================================================
function getPrismaClient(): any {
  if (!globalForPrisma.prisma) {
    const { PrismaClient } = require('@prisma/client')
    globalForPrisma.prisma = new PrismaClient({ log: ['query'] })
  }
  return globalForPrisma.prisma
}

// ============================================================
// Unified database interface
// Works with BOTH Prisma (local dev) and Turso (production)
// ============================================================

// SHI-010: Use crypto.randomUUID() for collision-free IDs (replaces Date.now()-based generator)
function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID (shouldn't happen in Node 19+/Edge)
  return 'c' + Date.now().toString(36) + Math.random().toString(36).substring(2, 8) + Math.random().toString(36).substring(2, 6);
}

// Helper to get current timestamp
function nowISO(): string {
  return new Date().toISOString()
}

// Helper to convert boolean fields from DB (0/1 → boolean)
function toBool(val: any): boolean {
  return val === 1 || val === true
}

// IMP-019: Safe JSON parse with fallback for corrupted/truncated JSON in DB
function safeJsonParse(val: any, fallback: any): any {
  if (Array.isArray(val)) return val
  if (typeof val === 'string') {
    try { return JSON.parse(val) } catch { return fallback }
  }
  return fallback
}

// Helper to convert JS values for SQL parameters
// - boolean → 0/1 (SQLite doesn't have native boolean)
// - Date → ISO string (@libsql/client doesn't support Date objects)
function toSqlValue(val: any): any {
  if (val === true) return 1
  if (val === false) return 0
  if (val instanceof Date) return val.toISOString()
  return val
}

// Helper to process where conditions into SQL conditions and values
// Handles: null, { gte }, { lte }, { lt }, { gt }, { not }, { contains }, { in }, and plain values
// IMPORTANT: Supports MULTIPLE operators on the same field, e.g. { gte: x, lt: y }
function buildWhereConditions(where: any, colPrefix: string = ''): { conditions: string[]; values: any[] } {
  const conditions: string[] = []
  const values: any[] = []
  if (!where) return { conditions, values }

  for (const [key, val] of Object.entries(where)) {
    const col = colPrefix ? `${colPrefix}${key}` : key

    if (val === null) {
      conditions.push(`${col} IS NULL`)
    } else if (val && typeof val === 'object' && !Array.isArray(val) &&
        ('gte' in val || 'lte' in val || 'lt' in val || 'gt' in val || 'not' in val || 'contains' in val || 'in' in val)) {
      // Handle operator object — may contain MULTIPLE operators
      if ('in' in val) {
        const placeholders = (val.in as any[]).map(() => '?').join(', ')
        conditions.push(`${col} IN (${placeholders})`)
        values.push(...(val.in as any[]).map(toSqlValue))
      }
      if ('gte' in val) {
        conditions.push(`${col} >= ?`)
        values.push(toSqlValue(val.gte))
      }
      if ('gt' in val) {
        conditions.push(`${col} > ?`)
        values.push(toSqlValue(val.gt))
      }
      if ('lte' in val) {
        conditions.push(`${col} <= ?`)
        values.push(toSqlValue(val.lte))
      }
      if ('lt' in val) {
        conditions.push(`${col} < ?`)
        values.push(toSqlValue(val.lt))
      }
      if ('not' in val) {
        if (val.not === null) {
          conditions.push(`${col} IS NOT NULL`)
        } else {
          conditions.push(`${col} != ?`)
          values.push(toSqlValue(val.not))
        }
      }
      if ('contains' in val) {
        conditions.push(`${col} LIKE ?`)
        values.push(`%${val.contains}%`)
      }
    } else {
      // Plain value equality
      conditions.push(`${col} = ?`)
      values.push(toSqlValue(val))
    }
  }
  return { conditions, values }
}

// Helper to build ORDER BY clause from orderBy param (supports both single and array)
function buildOrderBy(orderBy: any, prefix: string = ''): string {
  if (!orderBy) return ''
  const orderParts: string[] = []
  if (Array.isArray(orderBy)) {
    for (const ob of orderBy) {
      for (const [field, dir] of Object.entries(ob)) {
        orderParts.push(`${prefix}${field} ${dir === 'desc' ? 'DESC' : 'ASC'}`)
      }
    }
  } else {
    for (const [field, dir] of Object.entries(orderBy)) {
      orderParts.push(`${prefix}${field} ${dir === 'desc' ? 'DESC' : 'ASC'}`)
    }
  }
  return orderParts.length > 0 ? ` ORDER BY ${orderParts.join(', ')}` : ''
}

// Helper to map a User row from libsql to the shape Prisma would return
function mapUserRow(row: any): any {
  if (!row) return null
  return {
    ...row,
    isPremium: toBool(row.isPremium),
    emailVerified: toBool(row.emailVerified),
    termsAccepted: toBool(row.termsAccepted),
    deactivated: toBool(row.deactivated),
  }
}

// Helper to map a PaymentRecord row from libsql (ensures numeric fields are numbers)
function mapPaymentRecordRow(row: any): any {
  if (!row) return null
  return {
    ...row,
    month: Number(row.month),
    year: Number(row.year),
    totalExpected: Number(row.totalExpected || 0),
    totalReceived: Number(row.totalReceived || 0),
    totalHMRC: Number(row.totalHMRC || 0),
    totalDue: Number(row.totalDue || 0),
    workedHours: Number(row.workedHours || 0),
  }
}

// Helper to map a Shift row from libsql (ensures numeric fields are numbers)
function mapShiftRow(row: any): any {
  if (!row) return null
  return {
    ...row,
    breakMinutes: Number(row.breakMinutes || 0),
    totalHours: Number(row.totalHours || 0),
    payRate: Number(row.payRate || 0),
    client: row.client ?? null, // Handle missing column during migration
  }
}

// Helper to map a Company row (ensures numeric fields)
function mapCompanyRow(row: any): any {
  if (!row) return null
  return {
    ...row,
    payRate: Number(row.payRate || 0),
  }
}

// Helper to map a PayRateHistory row
function mapPayRateHistoryRow(row: any): any {
  if (!row) return null
  return {
    ...row,
    payRate: Number(row.payRate || 0),
  }
}

// Helper to map an ImportLog row
function mapImportLogRow(row: any): any {
  if (!row) return null
  return {
    ...row,
    shiftsCount: Number(row.shiftsCount || 0),
    paymentsCount: Number(row.paymentsCount || 0),
    companiesCreated: Number(row.companiesCreated || 0),
    reversed: toBool(row.reversed),
    // Parse JSON arrays stored as text
    // IMP-019: Wrap JSON.parse in try/catch to handle corrupted JSON gracefully
    shiftIds: safeJsonParse(row.shiftIds, []),
    paymentIds: safeJsonParse(row.paymentIds, []),
    companyIds: safeJsonParse(row.companyIds, []),
  }
}

// ==================== USER ====================
export const user = {
  async findUnique(args: { id?: string; email?: string; referralCode?: string; userId_name?: any; where?: any; select?: any }) {
    const where = args.where || args
    const select = args.select

    if (useTurso()) {
      const client = getTursoClient()
      let row: any = null

      if (where.id) {
        const r = await client.execute({ sql: 'SELECT * FROM User WHERE id = ?', args: [where.id] })
        row = r.rows[0] as any || null
      } else if (where.email) {
        const r = await client.execute({ sql: 'SELECT * FROM User WHERE email = ?', args: [where.email] })
        row = r.rows[0] as any || null
      } else if (where.referralCode) {
        const r = await client.execute({ sql: 'SELECT * FROM User WHERE referralCode = ?', args: [where.referralCode] })
        row = r.rows[0] as any || null
      }

      if (!row) return null
      const mapped = mapUserRow(row)
      if (select && typeof select === 'object') {
        const result: any = {}
        for (const key of Object.keys(select)) {
          if (key in mapped) result[key] = mapped[key]
        }
        return result
      }
      return mapped
    }
    const prisma = getPrismaClient()
    return prisma.user.findUnique({ where, select })
  },

  async findFirst(where: any) {
    if (useTurso()) {
      const client = getTursoClient()
      const { conditions, values } = buildWhereConditions(where)
      const sql = conditions.length > 0
        ? `SELECT * FROM User WHERE ${conditions.join(' AND ')} LIMIT 1`
        : `SELECT * FROM User LIMIT 1`
      const r = await client.execute({ sql, args: values })
      return mapUserRow(r.rows[0]) || null
    }
    const prisma = getPrismaClient()
    return prisma.user.findFirst({ where })
  },

  async findMany(args?: { where?: any; orderBy?: any; take?: number; skip?: number; select?: any }) {
    if (useTurso()) {
      const client = getTursoClient()
      const { conditions, values } = buildWhereConditions(args?.where)
      let sql = conditions.length > 0
        ? `SELECT * FROM User WHERE ${conditions.join(' AND ')}`
        : `SELECT * FROM User`
      sql += buildOrderBy(args?.orderBy)
      if (args?.take) sql += ` LIMIT ${args.take}`
      if (args?.skip) sql += ` OFFSET ${args.skip}`
      const r = await client.execute({ sql, args: values })
      return r.rows.map(mapUserRow) as any[]
    }
    const prisma = getPrismaClient()
    return prisma.user.findMany(args as any)
  },

  async count(args?: { where?: any }) {
    if (useTurso()) {
      const client = getTursoClient()
      const { conditions, values } = buildWhereConditions(args?.where)
      const sql = conditions.length > 0
        ? `SELECT COUNT(*) as cnt FROM User WHERE ${conditions.join(' AND ')}`
        : `SELECT COUNT(*) as cnt FROM User`
      const r = await client.execute({ sql, args: values })
      return Number(r.rows[0]?.cnt ?? 0)
    }
    const prisma = getPrismaClient()
    return prisma.user.count(args as any)
  },

  async create(data: { data: any }) {
    if (useTurso()) {
      const client = getTursoClient()
      const d = data.data
      const id = d.id || generateId()
      const now = nowISO()
      const fields = ['id', 'email', 'name', 'password', 'role', 'referralCode', 'isPremium', 'emailVerified', 'termsAccepted', 'createdAt', 'updatedAt']
      const values = [id, d.email, d.name, d.password, d.role || 'USER', d.referralCode, d.isPremium ? 1 : 0, d.emailVerified ? 1 : 0, d.termsAccepted ? 1 : 0, now, now]
      if (d.referredBy) { fields.push('referredBy'); values.push(d.referredBy) }
      if (d.referredById) { fields.push('referredById'); values.push(d.referredById) }
      if (d.phone) { fields.push('phone'); values.push(d.phone) }
      if (d.termsAcceptedAt) { fields.push('termsAcceptedAt'); values.push(typeof d.termsAcceptedAt === 'string' ? d.termsAcceptedAt : now) }
      const placeholders = fields.map(() => '?').join(', ')
      await client.execute({ sql: `INSERT INTO User (${fields.join(', ')}) VALUES (${placeholders})`, args: values })
      return this.findUnique({ where: { id } })
    }
    const prisma = getPrismaClient()
    return prisma.user.create(data)
  },

  async update(args: { where: { id?: string; email?: string }; data: any }) {
    if (useTurso()) {
      const client = getTursoClient()
      const existing = await this.findUnique({ where: args.where })
      if (!existing) throw new Error('User not found')
      const d = args.data
      const sets: string[] = ['updatedAt = ?']
      const values: any[] = [nowISO()]
      for (const [key, val] of Object.entries(d)) {
        if (key === 'updatedAt') continue
        sets.push(`${key} = ?`)
        values.push(toSqlValue(val))
      }
      values.push(existing.id)
      await client.execute({ sql: `UPDATE User SET ${sets.join(', ')} WHERE id = ?`, args: values })
      return this.findUnique({ where: { id: existing.id } })
    }
    const prisma = getPrismaClient()
    return prisma.user.update(args as any)
  },

  async delete(args: { where: { id: string } }) {
    if (useTurso()) {
      const client = getTursoClient()
      const existing = await this.findUnique({ where: { id: args.where.id } })
      await client.execute({ sql: 'DELETE FROM User WHERE id = ?', args: [args.where.id] })
      return existing
    }
    const prisma = getPrismaClient()
    return prisma.user.delete(args as any)
  },
}

// ==================== COMPANY ====================
export const company = {
  async findUnique(args: { id?: string; userId_name?: { userId: string; name: string }; where?: any }) {
    const where = args.where || args

    if (useTurso()) {
      const client = getTursoClient()
      if (where.id) {
        const r = await client.execute({ sql: 'SELECT * FROM Company WHERE id = ?', args: [where.id] })
        return mapCompanyRow(r.rows[0]) || null
      }
      if (where.userId_name) {
        const r = await client.execute({
          sql: 'SELECT * FROM Company WHERE userId = ? AND name = ?',
          args: [where.userId_name.userId, where.userId_name.name],
        })
        return mapCompanyRow(r.rows[0]) || null
      }
      return null
    }
    const prisma = getPrismaClient()
    return prisma.company.findUnique({ where })
  },

  async findMany(args?: { where?: any; orderBy?: any; include?: any }) {
    if (useTurso()) {
      const client = getTursoClient()
      const { conditions, values } = buildWhereConditions(args?.where)
      let sql = conditions.length > 0
        ? `SELECT * FROM Company WHERE ${conditions.join(' AND ')}`
        : `SELECT * FROM Company`
      sql += buildOrderBy(args?.orderBy)
      const r = await client.execute({ sql, args: values })
      const companies = r.rows.map(mapCompanyRow) as any[]

      // Support _count.paymentRecords via sub-count queries
      const needsCount = args?.include?._count?.select?.paymentRecords
      if (needsCount) {
        const companiesWithCount = await Promise.all(companies.map(async (c) => {
          const countResult = await client.execute({
            sql: 'SELECT COUNT(*) as cnt FROM PaymentRecord WHERE companyId = ?',
            args: [c.id],
          })
          return {
            ...c,
            _count: {
              paymentRecords: Number(countResult.rows[0]?.cnt ?? 0),
            },
          }
        }))
        return companiesWithCount
      }

      return companies
    }
    const prisma = getPrismaClient()
    return prisma.company.findMany(args as any)
  },

  async count(args?: { where?: any }) {
    if (useTurso()) {
      const client = getTursoClient()
      const { conditions, values } = buildWhereConditions(args?.where)
      const sql = conditions.length > 0
        ? `SELECT COUNT(*) as cnt FROM Company WHERE ${conditions.join(' AND ')}`
        : `SELECT COUNT(*) as cnt FROM Company`
      const r = await client.execute({ sql, args: values })
      return Number(r.rows[0]?.cnt ?? 0)
    }
    const prisma = getPrismaClient()
    return prisma.company.count(args as any)
  },

  async create(data: { data: any }) {
    if (useTurso()) {
      const client = getTursoClient()
      const d = data.data
      const id = generateId()
      const now = nowISO()
      await client.execute({
        sql: 'INSERT INTO Company (id, name, userId, payRate, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)',
        args: [id, d.name, d.userId, d.payRate ?? 0, now, now],
      })
      return this.findUnique({ where: { id } })
    }
    const prisma = getPrismaClient()
    return prisma.company.create(data)
  },

  async update(args: { where: { id: string }; data: any }) {
    if (useTurso()) {
      const client = getTursoClient()
      const d = args.data
      const sets: string[] = ['updatedAt = ?']
      const values: any[] = [nowISO()]
      for (const [key, val] of Object.entries(d)) {
        if (key === 'updatedAt') continue
        sets.push(`${key} = ?`)
        values.push(toSqlValue(val))
      }
      values.push(args.where.id)
      await client.execute({ sql: `UPDATE Company SET ${sets.join(', ')} WHERE id = ?`, args: values })
      return this.findUnique({ where: { id: args.where.id } })
    }
    const prisma = getPrismaClient()
    return prisma.company.update(args as any)
  },

  async delete(args: { where: { id: string } }) {
    if (useTurso()) {
      const client = getTursoClient()
      const existing = await this.findUnique({ where: { id: args.where.id } })
      // REC-008: Cascade delete — Turso/SQLite doesn't enforce foreign keys by default
      // Delete associated records before deleting company to prevent orphaned data
      await client.execute({ sql: 'DELETE FROM PayRateHistory WHERE companyId = ?', args: [args.where.id] })
      await client.execute({ sql: 'DELETE FROM PaymentRecord WHERE companyId = ?', args: [args.where.id] })
      await client.execute({ sql: 'DELETE FROM Shift WHERE companyId = ?', args: [args.where.id] })
      await client.execute({ sql: 'DELETE FROM Company WHERE id = ?', args: [args.where.id] })
      return existing
    }
    const prisma = getPrismaClient()
    return prisma.company.delete(args as any)
  },
}

// ==================== PAYMENT RECORD ====================
export const paymentRecord = {
  async findUnique(args: { id?: string; userId_companyId_month_year?: { userId: string; companyId: string; month: number; year: number }; where?: any }) {
    const where = args.where || args

    if (useTurso()) {
      const client = getTursoClient()
      let row: any = null

      if (where.id) {
        const r = await client.execute({
          sql: `SELECT pr.*, c.name as "company.name", c.id as "company.id" FROM PaymentRecord pr JOIN Company c ON pr.companyId = c.id WHERE pr.id = ?`,
          args: [where.id],
        })
        row = r.rows[0] as any
      }
      else if (where.userId_companyId_month_year) {
        const w = where.userId_companyId_month_year
        const r = await client.execute({
          sql: `SELECT pr.*, c.name as "company.name", c.id as "company.id" FROM PaymentRecord pr JOIN Company c ON pr.companyId = c.id WHERE pr.userId = ? AND pr.companyId = ? AND pr.month = ? AND pr.year = ?`,
          args: [w.userId, w.companyId, w.month, w.year],
        })
        row = r.rows[0] as any
      }

      if (!row) return null
      const mapped = mapPaymentRecordRow(row)
      return { ...mapped, company: { id: row['company.id'], name: row['company.name'] } }
    }
    const prisma = getPrismaClient()
    return prisma.paymentRecord.findUnique({ where, include: { company: { select: { id: true, name: true } } } })
  },

  async findMany(args?: { where?: any; orderBy?: any; include?: any }) {
    if (useTurso()) {
      const client = getTursoClient()
      const { conditions, values } = buildWhereConditions(args?.where, 'pr.')
      let sql = conditions.length > 0
        ? `SELECT pr.*, c.name as "company.name", c.id as "company.id" FROM PaymentRecord pr JOIN Company c ON pr.companyId = c.id WHERE ${conditions.join(' AND ')}`
        : `SELECT pr.*, c.name as "company.name", c.id as "company.id" FROM PaymentRecord pr JOIN Company c ON pr.companyId = c.id`
      sql += buildOrderBy(args?.orderBy, 'pr.')
      const r = await client.execute({ sql, args: values })
      return r.rows.map((row: any) => {
        const mapped = mapPaymentRecordRow(row)
        return { ...mapped, company: { id: row['company.id'], name: row['company.name'] } }
      }) as any[]
    }
    const prisma = getPrismaClient()
    return prisma.paymentRecord.findMany(args as any)
  },

  async count(args?: { where?: any }) {
    if (useTurso()) {
      const client = getTursoClient()
      const { conditions, values } = buildWhereConditions(args?.where)
      const sql = conditions.length > 0
        ? `SELECT COUNT(*) as cnt FROM PaymentRecord WHERE ${conditions.join(' AND ')}`
        : `SELECT COUNT(*) as cnt FROM PaymentRecord`
      const r = await client.execute({ sql, args: values })
      return Number(r.rows[0]?.cnt ?? 0)
    }
    const prisma = getPrismaClient()
    return prisma.paymentRecord.count(args as any)
  },

  async create(data: { data: any; include?: any }) {
    if (useTurso()) {
      const client = getTursoClient()
      const d = data.data
      const id = generateId()
      const now = nowISO()
      await client.execute({
        sql: `INSERT INTO PaymentRecord (id, userId, companyId, month, year, totalExpected, totalReceived, totalHMRC, totalDue, workedHours, status, notes, createdAt, updatedAt)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [id, d.userId, d.companyId, d.month, d.year, d.totalExpected ?? 0, d.totalReceived ?? 0, d.totalHMRC ?? 0, d.totalDue ?? 0, d.workedHours ?? 0, d.status ?? 'PENDING', d.notes ?? null, now, now],
      })
      return this.findUnique({ where: { id } })
    }
    const prisma = getPrismaClient()
    return prisma.paymentRecord.create(data)
  },

  async update(args: { where: { id: string }; data: any }) {
    if (useTurso()) {
      const client = getTursoClient()
      const d = args.data
      const sets: string[] = ['updatedAt = ?']
      const values: any[] = [nowISO()]
      for (const [key, val] of Object.entries(d)) {
        if (key === 'updatedAt') continue
        sets.push(`${key} = ?`)
        values.push(toSqlValue(val))
      }
      values.push(args.where.id)
      await client.execute({ sql: `UPDATE PaymentRecord SET ${sets.join(', ')} WHERE id = ?`, args: values })
      return this.findUnique({ where: { id: args.where.id } })
    }
    const prisma = getPrismaClient()
    return prisma.paymentRecord.update(args as any)
  },

  async delete(args: { where: { id: string } }) {
    if (useTurso()) {
      const client = getTursoClient()
      const existing = await this.findUnique({ where: { id: args.where.id } })
      await client.execute({ sql: 'DELETE FROM PaymentRecord WHERE id = ?', args: [args.where.id] })
      return existing
    }
    const prisma = getPrismaClient()
    return prisma.paymentRecord.delete(args as any)
  },
}

// ==================== SHIFT ====================
export const shift = {
  async findUnique(args: { id?: string; where?: any }) {
    const where = args.where || args

    if (useTurso()) {
      const client = getTursoClient()
      const r = await client.execute({
        sql: `SELECT s.*, c.name as "company.name", c.id as "company.id" FROM Shift s JOIN Company c ON s.companyId = c.id WHERE s.id = ?`,
        args: [where.id],
      })
      const row = r.rows[0] as any
      if (!row) return null
      const mapped = mapShiftRow(row)
      return { ...mapped, company: { id: row['company.id'], name: row['company.name'] } }
    }
    const prisma = getPrismaClient()
    return prisma.shift.findUnique({ where, include: { company: { select: { id: true, name: true } } } })
  },

  async findMany(args?: { where?: any; orderBy?: any; include?: any }) {
    if (useTurso()) {
      const client = getTursoClient()
      const { conditions, values } = buildWhereConditions(args?.where, 's.')
      let sql = conditions.length > 0
        ? `SELECT s.*, c.name as "company.name", c.id as "company.id" FROM Shift s JOIN Company c ON s.companyId = c.id WHERE ${conditions.join(' AND ')}`
        : `SELECT s.*, c.name as "company.name", c.id as "company.id" FROM Shift s JOIN Company c ON s.companyId = c.id`
      sql += buildOrderBy(args?.orderBy, 's.')
      const r = await client.execute({ sql, args: values })
      return r.rows.map((row: any) => {
        const mapped = mapShiftRow(row)
        return { ...mapped, company: { id: row['company.id'], name: row['company.name'] } }
      }) as any[]
    }
    const prisma = getPrismaClient()
    return prisma.shift.findMany(args as any)
  },

  async count(args?: { where?: any }) {
    if (useTurso()) {
      const client = getTursoClient()
      const { conditions, values } = buildWhereConditions(args?.where)
      const sql = conditions.length > 0
        ? `SELECT COUNT(*) as cnt FROM Shift WHERE ${conditions.join(' AND ')}`
        : `SELECT COUNT(*) as cnt FROM Shift`
      const r = await client.execute({ sql, args: values })
      return Number(r.rows[0]?.cnt ?? 0)
    }
    const prisma = getPrismaClient()
    return prisma.shift.count(args as any)
  },

  async create(data: { data: any }) {
    if (useTurso()) {
      const client = getTursoClient()
      const d = data.data
      const id = generateId()
      const now = nowISO()
      // SHI-011: Removed auto-migration try/catch — client column already exists in production
      await client.execute({
        sql: `INSERT INTO Shift (id, userId, companyId, date, startTime, endTime, breakMinutes, totalHours, shiftType, payRate, notes, client, createdAt, updatedAt)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [id, d.userId, d.companyId, d.date, d.startTime, d.endTime, d.breakMinutes ?? 0, d.totalHours ?? 0, d.shiftType ?? 'REGULAR', d.payRate ?? 0, d.notes ?? null, d.client ?? null, now, now],
      })
      return this.findUnique({ where: { id } })
    }
    const prisma = getPrismaClient()
    return prisma.shift.create(data)
  },

  async update(args: { where: { id: string }; data: any }) {
    if (useTurso()) {
      const client = getTursoClient()
      const d = args.data
      const sets: string[] = ['updatedAt = ?']
      const values: any[] = [nowISO()]
      for (const [key, val] of Object.entries(d)) {
        if (key === 'updatedAt') continue
        sets.push(`${key} = ?`)
        values.push(toSqlValue(val))
      }
      values.push(args.where.id)
      // SHI-011: Removed auto-migration try/catch — client column already exists in production
      await client.execute({ sql: `UPDATE Shift SET ${sets.join(', ')} WHERE id = ?`, args: values })
      return this.findUnique({ where: { id: args.where.id } })
    }
    const prisma = getPrismaClient()
    return prisma.shift.update(args as any)
  },

  async delete(args: { where: { id: string } }) {
    if (useTurso()) {
      const client = getTursoClient()
      const existing = await this.findUnique({ where: { id: args.where.id } })
      await client.execute({ sql: 'DELETE FROM Shift WHERE id = ?', args: [args.where.id] })
      return existing
    }
    const prisma = getPrismaClient()
    return prisma.shift.delete(args as any)
  },
}

// ==================== OTP CODE ====================
export const otpCode = {
  async findFirst(args: { where: { email?: string; type?: string; verified?: boolean; expiresAt?: any; createdAt?: any; code?: string }; orderBy?: any }) {
    if (useTurso()) {
      const client = getTursoClient()
      const conditions: string[] = []
      const values: any[] = []
      if (args.where.email !== undefined) {
        conditions.push('email = ?')
        values.push(args.where.email)
      }
      if (args.where.type !== undefined) {
        conditions.push('type = ?')
        values.push(args.where.type)
      }
      if (args.where.verified !== undefined) {
        conditions.push('verified = ?')
        values.push(args.where.verified ? 1 : 0)
      }
      if (args.where.code !== undefined) {
        conditions.push('code = ?')
        values.push(args.where.code)
      }
      // Handle expiresAt with operators (gte, lte, gt, lt)
      if (args.where.expiresAt) {
        if (typeof args.where.expiresAt === 'object') {
          if ('gte' in args.where.expiresAt) {
            conditions.push('expiresAt >= ?')
            values.push(toSqlValue(args.where.expiresAt.gte))
          }
          if ('lte' in args.where.expiresAt) {
            conditions.push('expiresAt <= ?')
            values.push(toSqlValue(args.where.expiresAt.lte))
          }
          if ('gt' in args.where.expiresAt) {
            conditions.push('expiresAt > ?')
            values.push(toSqlValue(args.where.expiresAt.gt))
          }
          if ('lt' in args.where.expiresAt) {
            conditions.push('expiresAt < ?')
            values.push(toSqlValue(args.where.expiresAt.lt))
          }
        }
      }
      // Handle createdAt with operators (gte, lte, gt, lt)
      if (args.where.createdAt) {
        if (typeof args.where.createdAt === 'object') {
          if ('gte' in args.where.createdAt) {
            conditions.push('createdAt >= ?')
            values.push(toSqlValue(args.where.createdAt.gte))
          }
          if ('lte' in args.where.createdAt) {
            conditions.push('createdAt <= ?')
            values.push(toSqlValue(args.where.createdAt.lte))
          }
          if ('gt' in args.where.createdAt) {
            conditions.push('createdAt > ?')
            values.push(toSqlValue(args.where.createdAt.gt))
          }
          if ('lt' in args.where.createdAt) {
            conditions.push('createdAt < ?')
            values.push(toSqlValue(args.where.createdAt.lt))
          }
        }
      }
      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
      const r = await client.execute({
        sql: `SELECT * FROM OtpCode ${whereClause} ORDER BY createdAt DESC LIMIT 1`,
        args: values,
      })
      const row = r.rows[0] as any
      if (!row) return null
      return { ...row, verified: toBool(row.verified) }
    }
    const prisma = getPrismaClient()
    return prisma.otpCode.findFirst(args as any)
  },

  async count(args?: { where?: any }) {
    if (useTurso()) {
      const client = getTursoClient()
      const { conditions, values } = buildWhereConditions(args?.where)
      const sql = conditions.length > 0
        ? `SELECT COUNT(*) as cnt FROM OtpCode WHERE ${conditions.join(' AND ')}`
        : `SELECT COUNT(*) as cnt FROM OtpCode`
      const r = await client.execute({ sql, args: values })
      return Number(r.rows[0]?.cnt ?? 0)
    }
    const prisma = getPrismaClient()
    return prisma.otpCode.count(args as any)
  },

  async create(data: { data: any }) {
    if (useTurso()) {
      const client = getTursoClient()
      const d = data.data
      const id = generateId()
      const now = nowISO()
      await client.execute({
        sql: `INSERT INTO OtpCode (id, email, code, type, verified, expiresAt, createdAt, userId)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [id, d.email, d.code, d.type, d.verified ? 1 : 0, toSqlValue(d.expiresAt), now, d.userId ?? null],
      })
      const r = await client.execute({ sql: 'SELECT * FROM OtpCode WHERE id = ?', args: [id] })
      const row = r.rows[0] as any
      return row ? { ...row, verified: toBool(row.verified) } : row
    }
    const prisma = getPrismaClient()
    return prisma.otpCode.create(data)
  },

  async update(args: { where: { id: string }; data: any }) {
    if (useTurso()) {
      const client = getTursoClient()
      const d = args.data
      const sets: string[] = []
      const values: any[] = []
      for (const [key, val] of Object.entries(d)) {
        sets.push(`${key} = ?`)
        values.push(toSqlValue(val))
      }
      values.push(args.where.id)
      await client.execute({ sql: `UPDATE OtpCode SET ${sets.join(', ')} WHERE id = ?`, args: values })
      const r = await client.execute({ sql: 'SELECT * FROM OtpCode WHERE id = ?', args: [args.where.id] })
      const row = r.rows[0] as any
      return row ? { ...row, verified: toBool(row.verified) } : row
    }
    const prisma = getPrismaClient()
    return prisma.otpCode.update(args as any)
  },

  async deleteMany(args: { where: { email: string; type?: string; code?: string } }) {
    if (useTurso()) {
      const client = getTursoClient()
      const conditions: string[] = ['email = ?']
      const values: any[] = [args.where.email]
      if (args.where.type) {
        conditions.push('type = ?')
        values.push(args.where.type)
      }
      if (args.where.code) {
        conditions.push('code = ?')
        values.push(args.where.code)
      }
      await client.execute({ sql: `DELETE FROM OtpCode WHERE ${conditions.join(' AND ')}`, args: values })
      return { count: 0 }
    }
    const prisma = getPrismaClient()
    return prisma.otpCode.deleteMany(args as any)
  },
}

// ==================== SETTING ====================
// Auto-create Setting table if it doesn't exist (for Turso databases that weren't set up with the latest schema)
async function ensureSettingTable(client: Client): Promise<void> {
  await client.execute(`
    CREATE TABLE IF NOT EXISTS Setting (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL,
      updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `)
  console.log('[DB] Auto-created Setting table')
}

export const setting = {
  async get(key: string): Promise<string | null> {
    if (useTurso()) {
      const client = getTursoClient()
      try {
        const r = await client.execute({ sql: 'SELECT value FROM Setting WHERE key = ?', args: [key] })
        return (r.rows[0]?.value as string) ?? null
      } catch (e: any) {
        if (String(e).includes('no such table')) {
          await ensureSettingTable(client)
          const r = await client.execute({ sql: 'SELECT value FROM Setting WHERE key = ?', args: [key] })
          return (r.rows[0]?.value as string) ?? null
        }
        throw e
      }
    }
    const prisma = getPrismaClient()
    const row = await prisma.setting.findUnique({ where: { key } })
    return row?.value ?? null
  },

  async set(key: string, value: string): Promise<void> {
    if (useTurso()) {
      const client = getTursoClient()
      try {
        await client.execute({
          sql: 'INSERT INTO Setting (key, value, updatedAt) VALUES (?, ?, datetime(\'now\')) ON CONFLICT(key) DO UPDATE SET value = ?, updatedAt = datetime(\'now\')',
          args: [key, value, value],
        })
      } catch (e: any) {
        if (String(e).includes('no such table')) {
          await ensureSettingTable(client)
          await client.execute({
            sql: 'INSERT INTO Setting (key, value, updatedAt) VALUES (?, ?, datetime(\'now\')) ON CONFLICT(key) DO UPDATE SET value = ?, updatedAt = datetime(\'now\')',
            args: [key, value, value],
          })
        } else {
          throw e
        }
      }
      return
    }
    const prisma = getPrismaClient()
    await prisma.setting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    })
  },

  async getAll(): Promise<Record<string, string>> {
    if (useTurso()) {
      const client = getTursoClient()
      try {
        const r = await client.execute({ sql: 'SELECT key, value FROM Setting', args: [] })
        const result: Record<string, string> = {}
        for (const row of r.rows) {
          result[row.key as string] = row.value as string
        }
        return result
      } catch (e: any) {
        if (String(e).includes('no such table')) {
          await ensureSettingTable(client)
          return {}
        }
        throw e
      }
    }
    const prisma = getPrismaClient()
    const rows = await prisma.setting.findMany()
    const result: Record<string, string> = {}
    for (const row of rows) {
      result[row.key] = row.value
    }
    return result
  },

  async delete(key: string): Promise<void> {
    if (useTurso()) {
      const client = getTursoClient()
      try {
        await client.execute({ sql: 'DELETE FROM Setting WHERE key = ?', args: [key] })
      } catch (e: any) {
        if (String(e).includes('no such table')) {
          await ensureSettingTable(client)
          return
        }
        throw e
      }
      return
    }
    const prisma = getPrismaClient()
    await prisma.setting.delete({ where: { key } })
  },
}

// ==================== PAY RATE HISTORY ====================
export const payRateHistory = {
  async findMany(args?: { where?: any; orderBy?: any }) {
    if (useTurso()) {
      const client = getTursoClient()
      const { conditions, values } = buildWhereConditions(args?.where)
      let sql = conditions.length > 0
        ? `SELECT * FROM PayRateHistory WHERE ${conditions.join(' AND ')}`
        : `SELECT * FROM PayRateHistory`
      sql += buildOrderBy(args?.orderBy)
      const r = await client.execute({ sql, args: values })
      return r.rows.map(mapPayRateHistoryRow) as any[]
    }
    const prisma = getPrismaClient()
    return prisma.payRateHistory.findMany(args as any)
  },

  async create(data: { data: any }) {
    if (useTurso()) {
      const client = getTursoClient()
      const d = data.data
      const id = generateId()
      const now = nowISO()
      await client.execute({
        sql: `INSERT INTO PayRateHistory (id, companyId, payRate, effectiveFrom, createdAt) VALUES (?, ?, ?, ?, ?)`,
        args: [id, d.companyId, d.payRate, d.effectiveFrom, now],
      })
      const r = await client.execute({ sql: 'SELECT * FROM PayRateHistory WHERE id = ?', args: [id] })
      return mapPayRateHistoryRow(r.rows[0])
    }
    const prisma = getPrismaClient()
    return prisma.payRateHistory.create(data)
  },

  async deleteMany(args: { where: any }) {
    if (useTurso()) {
      const client = getTursoClient()
      const { conditions, values } = buildWhereConditions(args.where)
      const sql = conditions.length > 0
        ? `DELETE FROM PayRateHistory WHERE ${conditions.join(' AND ')}`
        : `DELETE FROM PayRateHistory`
      await client.execute({ sql, args: values })
      return { count: 0 }
    }
    const prisma = getPrismaClient()
    return prisma.payRateHistory.deleteMany(args as any)
  },
}

// ==================== IMPORT LOG ====================
export const importLog = {
  async create(data: { data: any }) {
    if (useTurso()) {
      const client = getTursoClient()
      const d = data.data
      const id = generateId()
      const now = nowISO()
      await client.execute({
        sql: `INSERT INTO ImportLog (id, userId, fileName, fileType, importType, shiftsCount, paymentsCount, companiesCreated, shiftIds, paymentIds, companyIds, reversed, reversedAt, createdAt)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          id, d.userId, d.fileName || null, d.fileType || null, d.importType || 'auto',
          d.shiftsCount ?? 0, d.paymentsCount ?? 0, d.companiesCreated ?? 0,
          JSON.stringify(d.shiftIds || []), JSON.stringify(d.paymentIds || []), JSON.stringify(d.companyIds || []),
          d.reversed ? 1 : 0, d.reversedAt ? toSqlValue(d.reversedAt) : null, now,
        ],
      })
      return this.findUnique({ where: { id } })
    }
    const prisma = getPrismaClient()
    return prisma.importLog.create(data)
  },

  async findUnique(args: { where: { id: string } }) {
    if (useTurso()) {
      const client = getTursoClient()
      const r = await client.execute({ sql: 'SELECT * FROM ImportLog WHERE id = ?', args: [args.where.id] })
      return mapImportLogRow(r.rows[0]) || null
    }
    const prisma = getPrismaClient()
    return prisma.importLog.findUnique(args as any)
  },

  async findMany(args?: { where?: any; orderBy?: any; take?: number }) {
    if (useTurso()) {
      const client = getTursoClient()
      const { conditions, values } = buildWhereConditions(args?.where)
      let sql = conditions.length > 0
        ? `SELECT * FROM ImportLog WHERE ${conditions.join(' AND ')}`
        : `SELECT * FROM ImportLog`
      sql += buildOrderBy(args?.orderBy)
      if (args?.take) sql += ` LIMIT ${args.take}`
      const r = await client.execute({ sql, args: values })
      return r.rows.map(mapImportLogRow) as any[]
    }
    const prisma = getPrismaClient()
    return prisma.importLog.findMany(args as any)
  },

  async update(args: { where: { id: string }; data: any }) {
    if (useTurso()) {
      const client = getTursoClient()
      const d = args.data
      const sets: string[] = []
      const values: any[] = []
      for (const [key, val] of Object.entries(d)) {
        if (key === 'id' || key === 'createdAt') continue
        sets.push(`${key} = ?`)
        // Handle JSON fields
        if (key === 'shiftIds' || key === 'paymentIds' || key === 'companyIds') {
          values.push(JSON.stringify(val))
        } else {
          values.push(toSqlValue(val))
        }
      }
      values.push(args.where.id)
      await client.execute({ sql: `UPDATE ImportLog SET ${sets.join(', ')} WHERE id = ?`, args: values })
      return this.findUnique({ where: { id: args.where.id } })
    }
    const prisma = getPrismaClient()
    return prisma.importLog.update(args as any)
  },

  async delete(args: { where: { id: string } }) {
    if (useTurso()) {
      const client = getTursoClient()
      const existing = await this.findUnique({ where: { id: args.where.id } })
      await client.execute({ sql: 'DELETE FROM ImportLog WHERE id = ?', args: [args.where.id] })
      return existing
    }
    const prisma = getPrismaClient()
    return prisma.importLog.delete(args as any)
  },
}

// Auto-create ImportLog table if it doesn't exist
async function ensureImportLogTable(client: Client): Promise<void> {
  await client.execute(`
    CREATE TABLE IF NOT EXISTS ImportLog (
      id TEXT PRIMARY KEY NOT NULL,
      userId TEXT NOT NULL,
      fileName TEXT,
      fileType TEXT,
      importType TEXT DEFAULT 'auto',
      shiftsCount INTEGER DEFAULT 0,
      paymentsCount INTEGER DEFAULT 0,
      companiesCreated INTEGER DEFAULT 0,
      shiftIds TEXT DEFAULT '[]',
      paymentIds TEXT DEFAULT '[]',
      companyIds TEXT DEFAULT '[]',
      reversed INTEGER DEFAULT 0,
      reversedAt DATETIME,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `)
  console.log('[DB] Auto-created ImportLog table')
}

// Ensure ImportLog table exists on first use
let importLogTableEnsured = false
const origImportLogCreate = importLog.create.bind(importLog)
const origImportLogFindMany = importLog.findMany.bind(importLog)
const origImportLogFindUnique = importLog.findUnique.bind(importLog)

importLog.create = async (data: any) => {
  if (useTurso() && !importLogTableEnsured) {
    try {
      return await origImportLogCreate(data)
    } catch (e: any) {
      if (String(e).includes('no such table')) {
        const client = getTursoClient()
        await ensureImportLogTable(client)
        importLogTableEnsured = true
        return await origImportLogCreate(data)
      }
      throw e
    }
  }
  return origImportLogCreate(data)
}

importLog.findMany = async (args?: any) => {
  if (useTurso() && !importLogTableEnsured) {
    try {
      return await origImportLogFindMany(args)
    } catch (e: any) {
      if (String(e).includes('no such table')) {
        const client = getTursoClient()
        await ensureImportLogTable(client)
        importLogTableEnsured = true
        return await origImportLogFindMany(args)
      }
      throw e
    }
  }
  return origImportLogFindMany(args)
}

importLog.findUnique = async (args: any) => {
  if (useTurso() && !importLogTableEnsured) {
    try {
      return await origImportLogFindUnique(args)
    } catch (e: any) {
      if (String(e).includes('no such table')) {
        const client = getTursoClient()
        await ensureImportLogTable(client)
        importLogTableEnsured = true
        return await origImportLogFindUnique(args)
      }
      throw e
    }
  }
  return origImportLogFindUnique(args)
}

// Export as `db` for backward compatibility with existing code
export const db = { user, company, paymentRecord, shift, otpCode, setting, payRateHistory, importLog }
