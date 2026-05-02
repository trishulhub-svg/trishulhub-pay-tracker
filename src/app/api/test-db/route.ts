import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword } from '@/lib/auth';

export async function GET() {
  try {
    // Step 1: Try to find admin user
    const user = await db.user.findUnique({ where: { email: 'admin@trishulhub.com' } });
    
    // Step 2: Get all users count
    const allUsers = await db.user.findMany({});
    
    // Step 3: Hash test password
    const testHash = await hashPassword('admin123');
    
    return NextResponse.json({
      tursoUrl: process.env.TURSO_DATABASE_URL?.substring(0, 50),
      adminFound: !!user,
      adminData: user ? {
        id: user.id,
        email: user.email,
        role: user.role,
        passwordType: typeof user.password,
        passwordLength: user.password?.length,
        storedHash: user.password?.substring(0, 30) + '...',
        computedHash: testHash.substring(0, 30) + '...',
        hashesMatch: user.password === testHash,
      } : null,
      totalUsers: allUsers.length,
      allUserEmails: allUsers.map((u: any) => u.email),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message, stack: error.stack?.substring(0, 200) }, { status: 500 });
  }
}
