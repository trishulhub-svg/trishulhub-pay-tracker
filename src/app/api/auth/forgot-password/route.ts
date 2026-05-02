import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateOtpCode, getOtpExpiry, sendEmail, getOtpEmailHtml } from '@/lib/email';
import { isDisposableEmail, isLikelyValidEmailDomain } from '@/lib/email-validation';

// POST /api/auth/forgot-password - Request password reset OTP
export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    if (!isLikelyValidEmailDomain(normalizedEmail)) {
      return NextResponse.json({ error: 'Please enter a valid email address' }, { status: 400 });
    }

    // Always return same message to prevent email enumeration
    const successMessage = 'If this email is registered, you will receive a verification code';

    const user = await db.user.findUnique({ where: { email: normalizedEmail } });
    if (!user) {
      // Don't reveal whether the email exists
      return NextResponse.json({ message: successMessage });
    }

    // Rate limiting
    const recentOtp = await db.otpCode.findFirst({
      where: {
        email: normalizedEmail,
        type: 'PASSWORD_RESET',
        createdAt: { gte: new Date(Date.now() - 60 * 1000) },
      },
    });
    if (recentOtp) {
      return NextResponse.json({ message: successMessage });
    }

    const code = generateOtpCode();
    const expiresAt = getOtpExpiry();

    await db.otpCode.create({
      data: {
        email: normalizedEmail,
        code,
        type: 'PASSWORD_RESET',
        expiresAt,
        userId: user.id,
      },
    });

    const emailResult = await sendEmail({
      to: [{ email: normalizedEmail, name: user.name }],
      subject: 'TrishulHub - Reset Your Password',
      htmlContent: getOtpEmailHtml(code, 'PASSWORD_RESET'),
      textContent: `Your TrishulHub password reset code is: ${code}. It expires in 10 minutes.`,
    });

    if (!emailResult.success && process.env.NODE_ENV !== 'production') {
      console.log(`[DEV] Password reset OTP for ${normalizedEmail}: ${code}`);
    }

    return NextResponse.json({ message: successMessage });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
