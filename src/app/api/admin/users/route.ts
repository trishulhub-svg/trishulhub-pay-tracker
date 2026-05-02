import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/session';

// GET /api/admin/users — list all users with status
export async function GET() {
  try {
    const user = await getSession();
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const users = await db.user.findMany({
      orderBy: { createdAt: 'desc' },
    });

    // Map to safe public format (no password)
    const safeUsers = users.map((u: any) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      isPremium: !!u.isPremium,
      deactivated: !!u.deactivated,
      referredBy: u.referredBy || null,
      createdAt: u.createdAt,
    }));

    return NextResponse.json({ users: safeUsers });
  } catch (error) {
    console.error('Admin users list error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/admin/users — activate, deactivate, or delete a user
export async function PATCH(request: NextRequest) {
  try {
    const adminUser = await getSession();
    if (!adminUser || adminUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { userId, action } = body as { userId: string; action: 'activate' | 'deactivate' | 'delete' };

    if (!userId || !action) {
      return NextResponse.json({ error: 'userId and action are required' }, { status: 400 });
    }

    // Prevent admin from deactivating/deleting themselves
    if (userId === adminUser.id) {
      return NextResponse.json({ error: 'Cannot modify your own account' }, { status: 400 });
    }

    if (action === 'deactivate') {
      await db.user.update({
        where: { id: userId },
        data: { deactivated: true },
      });
      return NextResponse.json({ success: true, message: 'User deactivated' });
    }

    if (action === 'activate') {
      await db.user.update({
        where: { id: userId },
        data: { deactivated: false },
      });
      return NextResponse.json({ success: true, message: 'User activated' });
    }

    if (action === 'delete') {
      // Permanently delete user and all related data
      // Delete in order: shifts, payment records, pay rate history, companies, OTP codes, then user

      // 1. Delete all shifts for this user
      const userShifts = await db.shift.findMany({ where: { userId } });
      for (const s of userShifts) {
        await db.shift.delete({ where: { id: s.id } });
      }

      // 2. Delete all payment records for this user
      const userRecords = await db.paymentRecord.findMany({ where: { userId } });
      for (const r of userRecords) {
        await db.paymentRecord.delete({ where: { id: r.id } });
      }

      // 3. Delete all companies (and their pay rate history) for this user
      const userCompanies = await db.company.findMany({ where: { userId } });
      for (const c of userCompanies) {
        // Delete pay rate history for this company
        await db.payRateHistory.deleteMany({ where: { companyId: c.id } });
        await db.company.delete({ where: { id: c.id } });
      }

      // 4. Delete OTP codes for this user
      await db.otpCode.deleteMany({ where: { email: (await db.user.findUnique({ where: { id: userId } }))?.email || '' } });

      // 5. Finally delete the user
      await db.user.delete({ where: { id: userId } });

      return NextResponse.json({ success: true, message: 'User permanently deleted' });
    }

    return NextResponse.json({ error: 'Invalid action. Use: activate, deactivate, or delete' }, { status: 400 });
  } catch (error) {
    console.error('Admin user action error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
