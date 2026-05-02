import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword } from '@/lib/auth';

// TEMPORARY debug endpoint — DELETE after fixing login
export async function POST(request: Request) {
  try {
    const { email, password, action } = await request.json();
    
    // Check if Turso is being used
    const useTurso = !!(process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN && process.env.TURSO_DATABASE_URL.startsWith('libsql://'));
    const fullTursoUrl = process.env.TURSO_DATABASE_URL || 'NOT SET';
    
    // Action: create admin user directly
    if (action === 'seed-admin') {
      const hash = await hashPassword(password || 'admin123');
      const adminEmail = email || 'admin@trishulhub.com';
      
      try {
        // Try to create the admin user
        await db.user.create({
          data: {
            email: adminEmail,
            name: 'TrishulHub Admin',
            password: hash,
            role: 'ADMIN',
            referralCode: 'TRISHUL-ADMIN-' + Date.now().toString(36).toUpperCase(),
            isPremium: true,
            emailVerified: true,
            termsAccepted: true,
            termsAcceptedAt: new Date().toISOString(),
          }
        });
        
        return NextResponse.json({ 
          debug: true, 
          action: 'seed-admin',
          success: true,
          message: 'Admin user created with password: ' + (password || 'admin123'),
          useTurso,
          fullTursoUrl,
        });
      } catch (createError: any) {
        // If user already exists, update the password
        if (String(createError).includes('UNIQUE') || String(createError).includes('unique')) {
          await db.user.update({
            where: { email: adminEmail },
            data: { password: hash },
          });
          
          return NextResponse.json({ 
            debug: true, 
            action: 'seed-admin',
            success: true,
            message: 'Admin user password updated to: ' + (password || 'admin123'),
            useTurso,
            fullTursoUrl,
          });
        }
        throw createError;
      }
    }
    
    // Action: list all users
    if (action === 'list-users') {
      const users = await db.user.findMany({});
      return NextResponse.json({ 
        debug: true,
        action: 'list-users',
        useTurso,
        fullTursoUrl,
        userCount: users.length,
        users: users.map((u: any) => ({ id: u.id, email: u.email, role: u.role })),
      });
    }
    
    // Default: test login
    const user = await db.user.findUnique({ where: { email } });
    
    if (!user) {
      return NextResponse.json({ 
        debug: true,
        useTurso,
        fullTursoUrl,
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
      stack: error.stack?.substring(0, 300),
    }, { status: 500 });
  }
}
