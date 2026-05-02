import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { createSessionToken } from '@/lib/session';

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
    const { name, email, password, referralCode } = await request.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Name, email, and password are required' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
    }

    const hashedPassword = await hashPassword(password);

    // Generate unique referral code
    let newReferralCode = generateReferralCode();
    let codeExists = await db.user.findUnique({ where: { referralCode: newReferralCode } });
    while (codeExists) {
      newReferralCode = generateReferralCode();
      codeExists = await db.user.findUnique({ where: { referralCode: newReferralCode } });
    }

    // Check referral code if provided
    let referredBy: string | null = null;
    let isPremium = false;
    if (referralCode) {
      const referrer = await db.user.findUnique({ where: { referralCode } });
      if (referrer) {
        referredBy = referralCode;
        // Mark referrer as premium
        await db.user.update({
          where: { id: referrer.id },
          data: { isPremium: true },
        });
      }
    }

    const user = await db.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        referralCode: newReferralCode,
        referredBy,
        isPremium,
      },
    });

    const sessionUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      isPremium: user.isPremium,
      referralCode: user.referralCode,
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
