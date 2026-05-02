import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateOtpCode, getOtpExpiry, sendEmail, getOtpEmailHtml } from '@/lib/email';
import { isDisposableEmail, isLikelyValidEmailDomain } from '@/lib/email-validation';

// POST /api/auth/send-otp - Send OTP for signup verification
export async function POST(request: NextRequest) {
  try {
    const { email, type } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Validate email format and block disposable emails
    if (!isLikelyValidEmailDomain(normalizedEmail)) {
      return NextResponse.json(
        { error: 'Please use a valid email address. Disposable or temporary emails are not allowed.' },
        { status: 400 }
      );
    }

    if (isDisposableEmail(normalizedEmail)) {
      return NextResponse.json(
        { error: 'Disposable email addresses are not allowed. Please use a permanent email address.' },
        { status: 400 }
      );
    }

    const otpType = type || 'SIGNUP';

    if (otpType === 'SIGNUP') {
      // Check if email already registered
      const existing = await db.user.findUnique({ where: { email: normalizedEmail } });
      if (existing) {
        return NextResponse.json({ error: 'This email is already registered. Please sign in instead.' }, { status: 409 });
      }
    } else if (otpType === 'PASSWORD_RESET') {
      // Check if email exists
      const existing = await db.user.findUnique({ where: { email: normalizedEmail } });
      if (!existing) {
        // Don't reveal whether email exists for security
        return NextResponse.json({ message: 'If this email is registered, you will receive a verification code' }, { status: 200 });
      }
    }

    // Rate limiting: Check if an OTP was sent in the last 60 seconds
    const recentOtp = await db.otpCode.findFirst({
      where: {
        email: normalizedEmail,
        type: otpType,
        createdAt: { gte: new Date(Date.now() - 60 * 1000) },
      },
    });
    if (recentOtp) {
      return NextResponse.json({ error: 'Please wait 60 seconds before requesting a new code' }, { status: 429 });
    }

    const code = generateOtpCode();
    const expiresAt = getOtpExpiry();

    await db.otpCode.create({
      data: {
        email: normalizedEmail,
        code,
        type: otpType,
        expiresAt,
      },
    });

    // Send email
    const emailResult = await sendEmail({
      to: [{ email: normalizedEmail }],
      subject: otpType === 'SIGNUP' ? 'TrishulHub - Verify Your Email' : 'TrishulHub - Reset Your Password',
      htmlContent: getOtpEmailHtml(code, otpType),
      textContent: `Your TrishulHub verification code is: ${code}. It expires in 10 minutes.`,
    });

    if (!emailResult.success) {
      console.error('Failed to send OTP email:', emailResult.error);
      // OTP is NEVER displayed on screen - only sent via email
      // Clean up the OTP record since email failed
      await db.otpCode.deleteMany({ where: { email: normalizedEmail, code } });
      return NextResponse.json({ error: 'Failed to send verification email. Please try again later.' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Verification code sent' });
  } catch (error) {
    console.error('Send OTP error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
