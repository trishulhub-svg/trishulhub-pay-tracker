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
// Turso (libSQL) client for production
// ============================================================

function getTursoClient(): Client {
  // In serverless (Vercel), each function invocation may hit a different
  // Turso replica. We create a fresh client each time to avoid stale 
  // connections, and use HTTP (type: 'web') for proper serverless support.
  // DO NOT cache the client in production — it causes stale reads.
  const url = process.env.TURSO_DATABASE_URL
  const authToken = process.env.TURSO_AUTH_TOKEN

  if (!url || url === 'undefined') {
    throw new Error('[DB] TURSO_DATABASE_URL is not set or is invalid. Please set it in your Vercel environment variables.')
  }
  if (!authToken || authToken === 'undefined') {
    throw new Error('[DB] TURSO_AUTH_TOKEN is not set or is invalid. Please set it in your Vercel environment variables.')
  }

  return createClient({ url, authToken })
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
    // Lazy require - PrismaClient is only loaded when actually needed
    // This prevents "URL_INVALID" errors on Vercel where DATABASE_URL
    // might be a file: path that doesn't exist in serverless
    const { PrismaClient } = require('@prisma/client')
    globalForPrisma.prisma = new PrismaClient({ log: ['query'] })
  }
  return globalForPrisma.prisma
}

// ============================================================
// Unified database interface
// Works with BOTH Prisma (local dev) and Turso (production)
// ============================================================

// Helper to generate CUID-like IDs
function generateId(): string {
  return 'c' + Date.now().toString(36) + Math.random().toString(36).substring(2, 8)
}

// Helper to get current timestamp
function nowISO(): string {
  return new Date().toISOString()
}

// ==================== USER ====================
export const user = {
  async findUnique(where: { id?: string; email?: string; referralCode?: string }) {
    if (useTurso()) {
      const client = getTursoClient()
      if (where.id) {
        const r = await client.execute({ sql: 'SELECT * FROM User WHERE id = ?', args: [where.id] })
        return r.rows[0] as any || null
      }
      if (where.email) {
        const r = await client.execute({ sql: 'SELECT * FROM User WHERE email = ?', args: [where.email] })
        return r.rows[0] as any || null
      }
      if (where.referralCode) {
        const r = await client.execute({ sql: 'SELECT * FROM User WHERE referralCode = ?', args: [where.referralCode] })
        return r.rows[0] as any || null
      }
      return null
    }
    const prisma = getPrismaClient()
    return prisma.user.findUnique({ where })
  },

  async findFirst(where: any) {
    if (useTurso()) {
      const client = getTursoClient()
      const conditions: string[] = []
      const values: any[] = []
      for (const [key, val] of Object.entries(where)) {
        conditions.push(`${key} = ?`)
        values.push(val)
      }
      const sql = conditions.length > 0
        ? `SELECT * FROM User WHERE ${conditions.join(' AND ')} LIMIT 1`
        : `SELECT * FROM User LIMIT 1`
      const r = await client.execute({ sql, args: values })
      return r.rows[0] as any || null
    }
    const prisma = getPrismaClient()
    return prisma.user.findFirst({ where })
  },

  async findMany(args?: { where?: any; orderBy?: any; take?: number; skip?: number }) {
    if (useTurso()) {
      const client = getTursoClient()
      const conditions: string[] = []
      const values: any[] = []
      if (args?.where) {
        for (const [key, val] of Object.entries(args.where)) {
          if (val && typeof val === 'object' && 'gte' in val) {
            conditions.push(`${key} >= ?`)
            values.push(val.gte)
          } else if (val && typeof val === 'object' && 'lte' in val) {
            conditions.push(`${key} <= ?`)
            values.push(val.lte)
          } else if (val && typeof val === 'object' && 'contains' in val) {
            conditions.push(`${key} LIKE ?`)
            values.push(`%${val.contains}%`)
          } else {
            conditions.push(`${key} = ?`)
            values.push(val)
          }
        }
      }
      let sql = conditions.length > 0
        ? `SELECT * FROM User WHERE ${conditions.join(' AND ')}`
        : `SELECT * FROM User`
      if (args?.orderBy) {
        const [field, dir] = Object.entries(args.orderBy)[0] as [string, string]
        sql += ` ORDER BY ${field} ${dir === 'desc' ? 'DESC' : 'ASC'}`
      }
      if (args?.take) sql += ` LIMIT ${args.take}`
      if (args?.skip) sql += ` OFFSET ${args.skip}`
      const r = await client.execute({ sql, args: values })
      return r.rows as any[]
    }
    const prisma = getPrismaClient()
    return prisma.user.findMany(args as any)
  },

  async count(args?: { where?: any }) {
    if (useTurso()) {
      const client = getTursoClient()
      const conditions: string[] = []
      const values: any[] = []
      if (args?.where) {
        for (const [key, val] of Object.entries(args.where)) {
          if (val && typeof val === 'object' && 'gte' in val) {
            conditions.push(`${key} >= ?`)
            values.push(val.gte)
          } else if (val && typeof val === 'object' && 'lte' in val) {
            conditions.push(`${key} <= ?`)
            values.push(val.lte)
          } else {
            conditions.push(`${key} = ?`)
            values.push(val)
          }
        }
      }
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
      if (d.phone) { fields.push('phone'); values.push(d.phone) }
      if (d.termsAcceptedAt) { fields.push('termsAcceptedAt'); values.push(typeof d.termsAcceptedAt === 'string' ? d.termsAcceptedAt : now) }
      const placeholders = fields.map(() => '?').join(', ')
      await client.execute({ sql: `INSERT INTO User (${fields.join(', ')}) VALUES (${placeholders})`, args: values })
      return this.findUnique({ id })
    }
    const prisma = getPrismaClient()
    return prisma.user.create(data)
  },

  async update(args: { where: { id?: string; email?: string }; data: any }) {
    if (useTurso()) {
      const client = getTursoClient()
      const existing = await this.findUnique(args.where)
      if (!existing) throw new Error('User not found')
      const d = args.data
      const sets: string[] = ['updatedAt = ?']
      const values: any[] = [nowISO()]
      for (const [key, val] of Object.entries(d)) {
        if (key === 'updatedAt') continue
        sets.push(`${key} = ?`)
        values.push(val === true ? 1 : val === false ? 0 : val)
      }
      values.push(existing.id)
      await client.execute({ sql: `UPDATE User SET ${sets.join(', ')} WHERE id = ?`, args: values })
      return this.findUnique({ id: existing.id })
    }
    const prisma = getPrismaClient()
    return prisma.user.update(args as any)
  },
}

// ==================== COMPANY ====================
export const company = {
  async findUnique(where: { id?: string }) {
    if (useTurso()) {
      const client = getTursoClient()
      const r = await client.execute({ sql: 'SELECT * FROM Company WHERE id = ?', args: [where.id] })
      return r.rows[0] as any || null
    }
    const prisma = getPrismaClient()
    return prisma.company.findUnique({ where })
  },

  async findMany(args?: { where?: any; orderBy?: any }) {
    if (useTurso()) {
      const client = getTursoClient()
      const conditions: string[] = []
      const values: any[] = []
      if (args?.where) {
        for (const [key, val] of Object.entries(args.where)) {
          conditions.push(`${key} = ?`)
          values.push(val)
        }
      }
      let sql = conditions.length > 0
        ? `SELECT * FROM Company WHERE ${conditions.join(' AND ')}`
        : `SELECT * FROM Company`
      if (args?.orderBy) {
        const [field, dir] = Object.entries(args.orderBy)[0] as [string, string]
        sql += ` ORDER BY ${field} ${dir === 'desc' ? 'DESC' : 'ASC'}`
      }
      const r = await client.execute({ sql, args: values })
      return r.rows as any[]
    }
    const prisma = getPrismaClient()
    return prisma.company.findMany(args as any)
  },

  async count(args?: { where?: any }) {
    if (useTurso()) {
      const client = getTursoClient()
      const conditions: string[] = []
      const values: any[] = []
      if (args?.where) {
        for (const [key, val] of Object.entries(args.where)) {
          conditions.push(`${key} = ?`)
          values.push(val)
        }
      }
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
        sql: 'INSERT INTO Company (id, name, userId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)',
        args: [id, d.name, d.userId, now, now],
      })
      return this.findUnique({ id })
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
        values.push(val)
      }
      values.push(args.where.id)
      await client.execute({ sql: `UPDATE Company SET ${sets.join(', ')} WHERE id = ?`, args: values })
      return this.findUnique({ id: args.where.id })
    }
    const prisma = getPrismaClient()
    return prisma.company.update(args as any)
  },

  async delete(args: { where: { id: string } }) {
    if (useTurso()) {
      const client = getTursoClient()
      const existing = await this.findUnique({ id: args.where.id })
      await client.execute({ sql: 'DELETE FROM Company WHERE id = ?', args: [args.where.id] })
      return existing
    }
    const prisma = getPrismaClient()
    return prisma.company.delete(args as any)
  },
}

// ==================== PAYMENT RECORD ====================
export const paymentRecord = {
  async findUnique(where: { id?: string }) {
    if (useTurso()) {
      const client = getTursoClient()
      const r = await client.execute({
        sql: `SELECT pr.*, c.name as "company.name", c.id as "company.id" FROM PaymentRecord pr JOIN Company c ON pr.companyId = c.id WHERE pr.id = ?`,
        args: [where.id],
      })
      const row = r.rows[0] as any
      if (!row) return null
      return { ...row, company: { id: row['company.id'], name: row['company.name'] } }
    }
    const prisma = getPrismaClient()
    return prisma.paymentRecord.findUnique({ where, include: { company: { select: { id: true, name: true } } } })
  },

  async findMany(args?: { where?: any; orderBy?: any; include?: any }) {
    if (useTurso()) {
      const client = getTursoClient()
      const conditions: string[] = []
      const values: any[] = []
      if (args?.where) {
        for (const [key, val] of Object.entries(args.where)) {
          if (val && typeof val === 'object' && 'in' in val) {
            const placeholders = val.in.map(() => '?').join(', ')
            conditions.push(`pr.${key} IN (${placeholders})`)
            values.push(...val.in)
          } else if (val && typeof val === 'object' && 'gte' in val) {
            conditions.push(`pr.${key} >= ?`)
            values.push(val.gte)
          } else if (val && typeof val === 'object' && 'lte' in val) {
            conditions.push(`pr.${key} <= ?`)
            values.push(val.lte)
          } else {
            conditions.push(`pr.${key} = ?`)
            values.push(val)
          }
        }
      }
      let sql = conditions.length > 0
        ? `SELECT pr.*, c.name as "company.name", c.id as "company.id" FROM PaymentRecord pr JOIN Company c ON pr.companyId = c.id WHERE ${conditions.join(' AND ')}`
        : `SELECT pr.*, c.name as "company.name", c.id as "company.id" FROM PaymentRecord pr JOIN Company c ON pr.companyId = c.id`
      if (args?.orderBy) {
        const [field, dir] = Object.entries(args.orderBy)[0] as [string, string]
        sql += ` ORDER BY pr.${field} ${dir === 'desc' ? 'DESC' : 'ASC'}`
      }
      const r = await client.execute({ sql, args: values })
      return r.rows.map((row: any) => ({
        ...row,
        company: { id: row['company.id'], name: row['company.name'] },
      })) as any[]
    }
    const prisma = getPrismaClient()
    return prisma.paymentRecord.findMany(args as any)
  },

  async count(args?: { where?: any }) {
    if (useTurso()) {
      const client = getTursoClient()
      const conditions: string[] = []
      const values: any[] = []
      if (args?.where) {
        for (const [key, val] of Object.entries(args.where)) {
          if (val && typeof val === 'object' && 'in' in val) {
            const placeholders = val.in.map(() => '?').join(', ')
            conditions.push(`${key} IN (${placeholders})`)
            values.push(...val.in)
          } else {
            conditions.push(`${key} = ?`)
            values.push(val)
          }
        }
      }
      const sql = conditions.length > 0
        ? `SELECT COUNT(*) as cnt FROM PaymentRecord WHERE ${conditions.join(' AND ')}`
        : `SELECT COUNT(*) as cnt FROM PaymentRecord`
      const r = await client.execute({ sql, args: values })
      return Number(r.rows[0]?.cnt ?? 0)
    }
    const prisma = getPrismaClient()
    return prisma.paymentRecord.count(args as any)
  },

  async create(data: { data: any }) {
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
      return this.findUnique({ id })
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
        values.push(val === true ? 1 : val === false ? 0 : val ?? null)
      }
      values.push(args.where.id)
      await client.execute({ sql: `UPDATE PaymentRecord SET ${sets.join(', ')} WHERE id = ?`, args: values })
      return this.findUnique({ id: args.where.id })
    }
    const prisma = getPrismaClient()
    return prisma.paymentRecord.update(args as any)
  },

  async delete(args: { where: { id: string } }) {
    if (useTurso()) {
      const client = getTursoClient()
      const existing = await this.findUnique({ id: args.where.id })
      await client.execute({ sql: 'DELETE FROM PaymentRecord WHERE id = ?', args: [args.where.id] })
      return existing
    }
    const prisma = getPrismaClient()
    return prisma.paymentRecord.delete(args as any)
  },
}

// ==================== SHIFT ====================
export const shift = {
  async findUnique(where: { id?: string }) {
    if (useTurso()) {
      const client = getTursoClient()
      const r = await client.execute({
        sql: `SELECT s.*, c.name as "company.name", c.id as "company.id" FROM Shift s JOIN Company c ON s.companyId = c.id WHERE s.id = ?`,
        args: [where.id],
      })
      const row = r.rows[0] as any
      if (!row) return null
      return { ...row, company: { id: row['company.id'], name: row['company.name'] } }
    }
    const prisma = getPrismaClient()
    return prisma.shift.findUnique({ where, include: { company: { select: { id: true, name: true } } } })
  },

  async findMany(args?: { where?: any; orderBy?: any; include?: any }) {
    if (useTurso()) {
      const client = getTursoClient()
      const conditions: string[] = []
      const values: any[] = []
      if (args?.where) {
        for (const [key, val] of Object.entries(args.where)) {
          if (val && typeof val === 'object' && 'in' in val) {
            const placeholders = val.in.map(() => '?').join(', ')
            conditions.push(`s.${key} IN (${placeholders})`)
            values.push(...val.in)
          } else if (val && typeof val === 'object' && 'gte' in val) {
            conditions.push(`s.${key} >= ?`)
            values.push(val.gte)
          } else if (val && typeof val === 'object' && 'lte' in val) {
            conditions.push(`s.${key} <= ?`)
            values.push(val.lte)
          } else {
            conditions.push(`s.${key} = ?`)
            values.push(val)
          }
        }
      }
      let sql = conditions.length > 0
        ? `SELECT s.*, c.name as "company.name", c.id as "company.id" FROM Shift s JOIN Company c ON s.companyId = c.id WHERE ${conditions.join(' AND ')}`
        : `SELECT s.*, c.name as "company.name", c.id as "company.id" FROM Shift s JOIN Company c ON s.companyId = c.id`
      if (args?.orderBy) {
        const [field, dir] = Object.entries(args.orderBy)[0] as [string, string]
        sql += ` ORDER BY s.${field} ${dir === 'desc' ? 'DESC' : 'ASC'}`
      }
      const r = await client.execute({ sql, args: values })
      return r.rows.map((row: any) => ({
        ...row,
        company: { id: row['company.id'], name: row['company.name'] },
      })) as any[]
    }
    const prisma = getPrismaClient()
    return prisma.shift.findMany(args as any)
  },

  async count(args?: { where?: any }) {
    if (useTurso()) {
      const client = getTursoClient()
      const conditions: string[] = []
      const values: any[] = []
      if (args?.where) {
        for (const [key, val] of Object.entries(args.where)) {
          conditions.push(`${key} = ?`)
          values.push(val)
        }
      }
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
      await client.execute({
        sql: `INSERT INTO Shift (id, userId, companyId, date, startTime, endTime, breakMinutes, totalHours, shiftType, notes, createdAt, updatedAt)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [id, d.userId, d.companyId, d.date, d.startTime, d.endTime, d.breakMinutes ?? 0, d.totalHours ?? 0, d.shiftType ?? 'REGULAR', d.notes ?? null, now, now],
      })
      return this.findUnique({ id })
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
        values.push(val === true ? 1 : val === false ? 0 : val ?? null)
      }
      values.push(args.where.id)
      await client.execute({ sql: `UPDATE Shift SET ${sets.join(', ')} WHERE id = ?`, args: values })
      return this.findUnique({ id: args.where.id })
    }
    const prisma = getPrismaClient()
    return prisma.shift.update(args as any)
  },

  async delete(args: { where: { id: string } }) {
    if (useTurso()) {
      const client = getTursoClient()
      const existing = await this.findUnique({ id: args.where.id })
      await client.execute({ sql: 'DELETE FROM Shift WHERE id = ?', args: [args.where.id] })
      return existing
    }
    const prisma = getPrismaClient()
    return prisma.shift.delete(args as any)
  },
}

// ==================== OTP CODE ====================
export const otpCode = {
  async findFirst(args: { where: { email: string; type: string; verified?: boolean; expiresAt?: any }; orderBy?: any }) {
    if (useTurso()) {
      const client = getTursoClient()
      const conditions: string[] = ['email = ?', 'type = ?']
      const values: any[] = [args.where.email, args.where.type]
      if (args.where.verified !== undefined) {
        conditions.push('verified = ?')
        values.push(args.where.verified ? 1 : 0)
      }
      if (args.where.expiresAt && args.where.expiresAt.gte) {
        conditions.push('expiresAt >= ?')
        values.push(args.where.expiresAt.gte)
      }
      const r = await client.execute({
        sql: `SELECT * FROM OtpCode WHERE ${conditions.join(' AND ')} ORDER BY createdAt DESC LIMIT 1`,
        args: values,
      })
      return r.rows[0] as any || null
    }
    const prisma = getPrismaClient()
    return prisma.otpCode.findFirst(args as any)
  },

  async count(args?: { where?: any }) {
    if (useTurso()) {
      const client = getTursoClient()
      const conditions: string[] = []
      const values: any[] = []
      if (args?.where) {
        for (const [key, val] of Object.entries(args.where)) {
          conditions.push(`${key} = ?`)
          values.push(val)
        }
      }
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
        args: [id, d.email, d.code, d.type, d.verified ? 1 : 0, d.expiresAt, now, d.userId ?? null],
      })
      const r = await client.execute({ sql: 'SELECT * FROM OtpCode WHERE id = ?', args: [id] })
      return r.rows[0] as any
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
        values.push(val === true ? 1 : val === false ? 0 : val)
      }
      values.push(args.where.id)
      await client.execute({ sql: `UPDATE OtpCode SET ${sets.join(', ')} WHERE id = ?`, args: values })
      const r = await client.execute({ sql: 'SELECT * FROM OtpCode WHERE id = ?', args: [args.where.id] })
      return r.rows[0] as any
    }
    const prisma = getPrismaClient()
    return prisma.otpCode.update(args as any)
  },

  async deleteMany(args: { where: { email: string; type?: string } }) {
    if (useTurso()) {
      const client = getTursoClient()
      if (args.where.type) {
        await client.execute({ sql: 'DELETE FROM OtpCode WHERE email = ? AND type = ?', args: [args.where.email, args.where.type] })
      } else {
        await client.execute({ sql: 'DELETE FROM OtpCode WHERE email = ?', args: [args.where.email] })
      }
      return { count: 0 }
    }
    const prisma = getPrismaClient()
    return prisma.otpCode.deleteMany(args as any)
  },
}

// ==================== SETTING ====================
export const setting = {
  async get(key: string): Promise<string | null> {
    if (useTurso()) {
      const client = getTursoClient()
      const r = await client.execute({ sql: 'SELECT value FROM Setting WHERE key = ?', args: [key] })
      return (r.rows[0]?.value as string) ?? null
    }
    const prisma = getPrismaClient()
    const row = await prisma.setting.findUnique({ where: { key } })
    return row?.value ?? null
  },

  async set(key: string, value: string): Promise<void> {
    if (useTurso()) {
      const client = getTursoClient()
      await client.execute({
        sql: 'INSERT INTO Setting (key, value, updatedAt) VALUES (?, ?, datetime(\'now\')) ON CONFLICT(key) DO UPDATE SET value = ?, updatedAt = datetime(\'now\')',
        args: [key, value, value],
      })
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
      const r = await client.execute({ sql: 'SELECT key, value FROM Setting', args: [] })
      const result: Record<string, string> = {}
      for (const row of r.rows) {
        result[row.key as string] = row.value as string
      }
      return result
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
      await client.execute({ sql: 'DELETE FROM Setting WHERE key = ?', args: [key] })
      return
    }
    const prisma = getPrismaClient()
    await prisma.setting.delete({ where: { key } })
  },
}

// Export as `db` for backward compatibility with existing code
export const db = { user, company, paymentRecord, shift, otpCode, setting }
