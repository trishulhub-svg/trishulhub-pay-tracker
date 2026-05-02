import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword } from '@/lib/auth';

// TEMPORARY debug endpoint — DELETE after fixing login
export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();
    
    // Check if Turso is being used
    const useTurso = !!(process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN && process.env.TURSO_DATABASE_URL.startsWith('libsql://'));
    const fullTursoUrl = process.env.TURSO_DATABASE_URL || 'NOT SET';
    const tursoTokenPrefix = process.env.TURSO_AUTH_TOKEN?.substring(0, 15) || 'NOT SET';
    // Try to find user
    const user = await db.user.findUnique({ where: { email } });
    
    if (!user) {
      return NextResponse.json({ 
        debug: true,
        useTurso,
        fullTursoUrl,
        tursoTokenPrefix,
        error: 'User not found in database',
        email,
      });
    }
    
    // Check password
    const computedHash = await hashPassword(password);
    const storedPassword = user.password;
    const match = computedHash === storedPassword;
    
    return NextResponse.json({
      debug: true,
      useTurso,
      fullTursoUrl,
      tursoTokenPrefix,
      userId: user.id,
      userEmail: user.email,
      userRole: user.role,
      storedHash: storedPassword?.substring(0, 20) + '...',
      computedHash: computedHash?.substring(0, 20) + '...',
      match,
      storedLength: storedPassword?.length,
      computedLength: computedHash?.length,
    });
  } catch (error: any) {
    return NextResponse.json({ 
      debug: true,
      error: error.message,
      stack: error.stack?.substring(0, 200),
    }, { status: 500 });
  }
}
