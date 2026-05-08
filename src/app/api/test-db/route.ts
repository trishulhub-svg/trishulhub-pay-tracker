import { NextResponse } from 'next/server';
import { createClient } from '@libsql/client';
import { hashPassword } from '@/lib/auth';

export async function GET() {
  try {
    const url = process.env.TURSO_DATABASE_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;
    
    if (!url || !authToken) {
      return NextResponse.json({ error: 'Missing Turso env vars' });
    }

    // Create a FRESH client (not through db.ts) to test directly
    const client = createClient({ url, authToken });
    
    // Test 1: Find by email (like findUnique does)
    const r1 = await client.execute({ sql: 'SELECT * FROM User WHERE email = ?', args: ['admin@trishulhub.com'] });
    
    // Test 2: Find all (like findMany does)
    const r2 = await client.execute({ sql: 'SELECT * FROM User', args: [] });
    
    // Test 3: Direct string comparison
    let emailMatch = false;
    let emailDetails: Record<string, unknown> | null = null;
    if (r2.rows.length > 0) {
      const dbEmail = r2.rows[0].email as string;
      emailMatch = dbEmail === 'admin@trishulhub.com';
      emailDetails = {
        dbEmail,
        dbEmailLength: dbEmail.length,
        dbEmailJson: JSON.stringify(dbEmail),
        charCodes: Array.from(dbEmail).map(c => c.charCodeAt(0)),
      };
    }
    
    // Test 4: Password hash comparison
    let passwordInfo: Record<string, unknown> | null = null;
    if (r1.rows.length > 0) {
      const storedPassword = r1.rows[0].password as string;
      const computedHash = await hashPassword('admin123');
      passwordInfo = {
        stored: storedPassword.substring(0, 30) + '...',
        computed: computedHash.substring(0, 30) + '...',
        match: storedPassword === computedHash,
        storedLength: storedPassword.length,
        computedLength: computedHash.length,
      };
    }

    return NextResponse.json({
      tursoUrl: url.substring(0, 50),
      test1_findUnique: { rows: r1.rows.length, found: r1.rows.length > 0 },
      test2_findMany: { rows: r2.rows.length, found: r2.rows.length > 0 },
      test3_emailComparison: { match: emailMatch, details: emailDetails },
      test4_passwordCheck: passwordInfo,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message, stack: error.stack?.substring(0, 300) }, { status: 500 });
  }
}
