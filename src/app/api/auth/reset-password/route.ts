import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { sendEmail, getPasswordResetSuccessHtml } from '@/lib/email';

// POST /api/auth/reset-password - Reset password after OTP verification
export async function POST(request: NextRequest) {
  try {
    const { email, code, newPassword } = await request.json();

    if (!email || !code || !newPassword) {
      return NextResponse.json({ error: 'Email, verification code, and new password are required' }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Verify OTP
    const otpRecord = await db.otpCode.findFirst({
      where: {
        email: normalizedEmail,
        type: 'PASSWORD_RESET',
        verified: true,
        expiresAt: { gte: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otpRecord) {
      return NextResponse.json({ error: 'Please verify your email first with the verification code' }, { status: 400 });
    }

    if (otpRecord.code !== code) {
      return NextResponse.json({ error: 'Invalid verification code' }, { status: 400 });
    }

    // Find user
    const user = await db.user.findUnique({ where: { email: normalizedEmail } });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Update password
    const hashedPassword = await hashPassword(newPassword);
    await db.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    // Invalidate all OTP codes for this email
    await db.otpCode.deleteMany({
      where: { email: normalizedEmail },
    });

    // Send confirmation email
    await sendEmail({
      to: [{ email: normalizedEmail, name: user.name }],
      subject: 'TrishulHub - Password Changed Successfully',
      htmlContent: getPasswordResetSuccessHtml(),
    }).catch(() => { /* non-critical */ });

    return NextResponse.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
