import { PrismaClient } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'
import { createClient } from '@libsql/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  const tursoUrl = process.env.TURSO_DATABASE_URL
  const tursoToken = process.env.TURSO_AUTH_TOKEN

  // In production (Vercel), use Turso via libSQL adapter
  // Only use Turso if BOTH values are present and NOT the string "undefined"
  if (
    tursoUrl &&
    tursoToken &&
    tursoUrl !== 'undefined' &&
    tursoToken !== 'undefined' &&
    tursoUrl.startsWith('libsql://')
  ) {
    console.log('[DB] Using Turso database:', tursoUrl.replace(/\/\/.*@/, '//***@'))
    const libsql = createClient({
      url: tursoUrl,
      authToken: tursoToken,
    })
    const adapter = new PrismaLibSql(libsql)
    return new PrismaClient({ adapter })
  }

  // In development, use local SQLite file
  console.log('[DB] Using local SQLite database')
  return new PrismaClient({
    log: ['query'],
  })
}

export const db = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
