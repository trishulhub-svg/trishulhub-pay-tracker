import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { createSessionToken } from '@/lib/session';
import { isDisposableEmail, isLikelyValidEmailDomain } from '@/lib/email-validation';

function generateReferralCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = 'TRISHUL-';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function POST(request: NextRequest) {
  try {
    const { name, email, password, referralCode, termsAccepted, otpCode } = await request.json();

    if (!name || !email || !password || !otpCode) {
      return NextResponse.json({ error: 'Name, email, password, and verification code are required' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    if (!termsAccepted) {
      return NextResponse.json({ error: 'You must accept the Terms and Conditions to sign up' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Block disposable emails
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

    // Verify OTP was verified
    const otpRecord = await db.otpCode.findFirst({
      where: {
        email: normalizedEmail,
        type: 'SIGNUP',
        verified: true,
        expiresAt: { gte: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otpRecord) {
      return NextResponse.json({ error: 'Please verify your email address first. Enter the verification code sent to your email.' }, { status: 400 });
    }

    if (otpRecord.code !== otpCode) {
      return NextResponse.json({ error: 'Invalid verification code. Please try again.' }, { status: 400 });
    }

    // Check if email already registered
    const existing = await db.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      return NextResponse.json({ error: 'This email is already registered. Please sign in instead.' }, { status: 409 });
    }

    const hashedPassword = await hashPassword(password);

    // Generate unique referral code
    let newReferralCode = generateReferralCode();
    let codeExists = await db.user.findUnique({ where: { referralCode: newReferralCode } });
    while (codeExists) {
      newReferralCode = generateReferralCode();
      codeExists = await db.user.findUnique({ where: { referralCode: newReferralCode } });
    }

    // Check referral code if provided - ONLY the REFERRER gets premium
    let referredBy: string | null = null;
    if (referralCode) {
      const referrer = await db.user.findUnique({ where: { referralCode } });
      if (referrer) {
        referredBy = referralCode;
        // Mark the REFERRER as premium - they referred someone
        await db.user.update({
          where: { id: referrer.id },
          data: { isPremium: true },
        });
      }
    }

    // Create user with email verified
    const user = await db.user.create({
      data: {
        email: normalizedEmail,
        name,
        password: hashedPassword,
        referralCode: newReferralCode,
        referredBy,
        isPremium: false,
        termsAccepted: true,
        termsAcceptedAt: new Date(),
        emailVerified: true,
      },
    });

    // Clean up used OTP codes
    await db.otpCode.deleteMany({
      where: { email: normalizedEmail },
    });

    const sessionUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      isPremium: user.isPremium,
      referralCode: user.referralCode,
      role: user.role,
    };

    const token = createSessionToken(sessionUser);

    const response = NextResponse.json({
      user: sessionUser,
      message: 'Account created successfully',
    }, { status: 201 });

    response.cookies.set('session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
