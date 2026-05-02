import { NextResponse } from 'next/server'

export async function GET() {
  // This endpoint helps debug which env vars are available on Vercel
  // DELETE THIS FILE after debugging - it exposes env var names (not values)
  const envStatus = {
    DATABASE_URL: !!process.env.DATABASE_URL,
    TURSO_DATABASE_URL: !!process.env.TURSO_DATABASE_URL,
    TURSO_DATABASE_URL_prefix: process.env.TURSO_DATABASE_URL?.substring(0, 30) + '...' || 'NOT SET',
    TURSO_AUTH_TOKEN: !!process.env.TURSO_AUTH_TOKEN,
    TURSO_AUTH_TOKEN_prefix: process.env.TURSO_AUTH_TOKEN?.substring(0, 10) + '...' || 'NOT SET',
    SESSION_SECRET: !!process.env.SESSION_SECRET,
    BREVO_API_KEY: !!process.env.BREVO_API_KEY,
    BREVO_FROM_EMAIL: !!process.env.BREVO_FROM_EMAIL,
    BREVO_SMTP_LOGIN: !!process.env.BREVO_SMTP_LOGIN,
    BREVO_SMTP_SERVER: !!process.env.BREVO_SMTP_SERVER,
    BREVO_SMTP_PORT: !!process.env.BREVO_SMTP_PORT,
    NODE_ENV: process.env.NODE_ENV,
  }

  return NextResponse.json(envStatus, { status: 200 })
}
