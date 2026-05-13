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

    // REF-020: Resolve referral codes to referrer names
    const referralCodes = [...new Set(users.map((u: any) => u.referredBy).filter(Boolean))] as string[];
    let referrerMap: Record<string, string> = {};
    if (referralCodes.length > 0) {
      for (const code of referralCodes) {
        const referrer = await db.user.findUnique({ where: { referralCode: code } });
        if (referrer) referrerMap[code] = referrer.name || referrer.email;
      }
    }

    // Map to safe public format (no password)
    const safeUsers = users.map((u: any) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      isPremium: !!u.isPremium,
      deactivated: !!u.deactivated,
      referredBy: u.referredBy || null,
      referredByName: u.referredBy ? (referrerMap[u.referredBy] || null) : null,
      createdAt: u.createdAt,
    }));

    return NextResponse.json({ users: safeUsers });
  } catch (error) {
    console.error('Admin users list error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/admin/users — activate, deactivate, delete, or change email of a user
export async function PATCH(request: NextRequest) {
  try {
    const adminUser = await getSession();
    if (!adminUser || adminUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { userId, action, newEmail } = body as { userId: string; action: 'activate' | 'deactivate' | 'delete' | 'change-email'; newEmail?: string };

    if (!userId || !action) {
      return NextResponse.json({ error: 'userId and action are required' }, { status: 400 });
    }

    // Prevent admin from deactivating/deleting themselves
    if (userId === adminUser.id && action !== 'change-email') {
      return NextResponse.json({ error: 'Cannot modify your own account' }, { status: 400 });
    }

    if (action === 'change-email') {
      if (!newEmail || !newEmail.includes('@')) {
        return NextResponse.json({ error: 'A valid new email address is required' }, { status: 400 });
      }
      const normalizedEmail = newEmail.toLowerCase().trim();

      // Check if email is already taken by another user
      const existingUser = await db.user.findUnique({ where: { email: normalizedEmail } });
      if (existingUser && existingUser.id !== userId) {
        return NextResponse.json({ error: 'This email is already in use by another account' }, { status: 409 });
      }

      // Get current user to update OTP records too
      const currentUser = await db.user.findUnique({ where: { id: userId } });
      if (!currentUser) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      // Update user email
      await db.user.update({
        where: { id: userId },
        data: { email: normalizedEmail },
      });

      // Update OTP codes linked to old email
      await db.otpCode.deleteMany({ where: { email: currentUser.email } });

      return NextResponse.json({ success: true, message: `Email changed to ${normalizedEmail}` });
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

      // REF-006: If the deleted user was referred, re-check the referrer's premium status
      const userToDelete = await db.user.findUnique({ where: { id: userId } });
      if (userToDelete?.referredBy) {
        const referrer = await db.user.findUnique({ where: { referralCode: userToDelete.referredBy } });
        if (referrer) {
          // Count how many users have this referral code (includes the one being deleted)
          const allReferred = await db.user.count({
            where: { referredBy: userToDelete.referredBy },
          });
          if (allReferred <= 1) {
            // This is the last (or only) referred user — revoke premium
            await db.user.update({
              where: { id: referrer.id },
              data: { isPremium: false },
            });
          }
        }
      }

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

    return NextResponse.json({ error: 'Invalid action. Use: activate, deactivate, delete, or change-email' }, { status: 400 });
  } catch (error) {
    console.error('Admin user action error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
