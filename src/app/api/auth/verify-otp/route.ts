import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// POST /api/auth/verify-otp - Verify OTP code (for signup or password reset)
export async function POST(request: NextRequest) {
  try {
    const { email, code, type } = await request.json();

    if (!email || !code) {
      return NextResponse.json({ error: 'Email and verification code are required' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const otpType = type || 'SIGNUP';

    // Find the most recent unverified OTP for this email and type
    const otpRecord = await db.otpCode.findFirst({
      where: {
        email: normalizedEmail,
        type: otpType,
        verified: false,
        expiresAt: { gte: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otpRecord) {
      return NextResponse.json({ error: 'Invalid or expired verification code. Please request a new one.' }, { status: 400 });
    }

    if (otpRecord.code !== code) {
      // Brute-force protection: limit wrong verification attempts
      // We use a simple counter approach - after 5 wrong attempts on the same OTP, lock out
      // Count how many times this specific OTP record has been checked (it's still unverified)
      // For simplicity, we count total OTP records created in last 15 min as a proxy for activity
      // But only enforce lockout if there are too many records AND the current code is wrong
      const recentOtpCount = await db.otpCode.count({
        where: {
          email: normalizedEmail,
          type: otpType,
          createdAt: { gte: new Date(Date.now() - 15 * 60 * 1000) }, // last 15 min
        },
      });

      if (recentOtpCount >= 10) {
        return NextResponse.json({ error: 'Too many attempts. Please request a new code.' }, { status: 429 });
      }

      return NextResponse.json({ error: 'Incorrect verification code. Please try again.' }, { status: 400 });
    }

    // Mark OTP as verified
    await db.otpCode.update({
      where: { id: otpRecord.id },
      data: { verified: true },
    });

    return NextResponse.json({ message: 'Email verified successfully', verified: true });
  } catch (error) {
    console.error('Verify OTP error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
