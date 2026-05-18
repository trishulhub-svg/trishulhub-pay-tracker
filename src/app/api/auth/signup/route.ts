import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { createSessionToken } from '@/lib/session';
import { isDisposableEmail, isLikelyValidEmailDomain } from '@/lib/email-validation';
import { timingSafeEqual, randomInt } from 'crypto';

function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
}

const REFERRAL_CODE_RE = /^TRISHUL-[A-Z0-9]{6}$/;

// REF-003: Simple in-memory rate limiter for referral code lookups
const referralLookupAttempts = new Map<string, { count: number; windowStart: number }>();
const MAX_REFERRAL_LOOKUPS = 10;
const REFERRAL_LOOKUP_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

function isReferralLookupRateLimited(): boolean {
  const now = Date.now();
  let entry = referralLookupAttempts.get('global');
  if (!entry || now - entry.windowStart > REFERRAL_LOOKUP_WINDOW_MS) {
    referralLookupAttempts.set('global', { count: 1, windowStart: now });
    return false;
  }
  entry.count++;
  return entry.count > MAX_REFERRAL_LOOKUPS;
}

function generateReferralCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = 'TRISHUL-';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(randomInt(chars.length));
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

    if (!safeCompare(otpRecord.code, otpCode)) {
      return NextResponse.json({ error: 'Invalid verification code. Please try again.' }, { status: 400 });
    }

    // REF-022: Normalize referral code to uppercase on server
    const normalizedReferralCode = referralCode ? String(referralCode).trim().toUpperCase() : null;

    // REF-002: Validate referral code format before DB lookup
    if (normalizedReferralCode && !REFERRAL_CODE_RE.test(normalizedReferralCode)) {
      return NextResponse.json(
        { error: 'Invalid referral code format. It should look like TRISHUL-XXXXXX.' },
        { status: 400 }
      );
    }

    // REF-003: Rate limit referral code validation lookups
    if (normalizedReferralCode && isReferralLookupRateLimited()) {
      return NextResponse.json(
        { error: 'Too many referral attempts. Please try again later.' },
        { status: 429 }
      );
    }

    // Run independent checks in parallel: existing user + hash password + referral lookup
    const [existing, hashedPassword, referrer] = await Promise.all([
      db.user.findUnique({ where: { email: normalizedEmail } }),
      hashPassword(password),
      normalizedReferralCode
        ? db.user.findUnique({ where: { referralCode: normalizedReferralCode } }).catch(() => null)
        : Promise.resolve(null),
    ]);

    if (existing) {
      return NextResponse.json({ error: 'This email is already registered. Please sign in instead.' }, { status: 409 });
    }

    // Generate unique referral code (REF-012: max 10 attempts guard)
    const MAX_CODE_GEN_ATTEMPTS = 10;
    let newReferralCode = generateReferralCode();
    let codeExists = await db.user.findUnique({ where: { referralCode: newReferralCode } });
    let attempts = 1;
    while (codeExists && attempts < MAX_CODE_GEN_ATTEMPTS) {
      newReferralCode = generateReferralCode();
      codeExists = await db.user.findUnique({ where: { referralCode: newReferralCode } });
      attempts++;
    }
    if (codeExists) {
      return NextResponse.json({ error: 'Could not generate a unique referral code. Please try again.' }, { status: 500 });
    }

    // Mark referrer as premium if valid (and not deactivated)
    let referredBy: string | null = null;
    if (referrer) {
      // REF-001: Reject referral codes from deactivated/banned accounts
      if (referrer.deactivated) {
        return NextResponse.json(
          { error: 'This referral code is no longer valid.' },
          { status: 400 }
        );
      }
      // REF-007: Prevent self-referral via same email domain (alt-account detection)
      const newDomain = normalizedEmail.split('@')[1];
      const referrerDomain = referrer.email.split('@')[1];
      if (newDomain && referrerDomain && newDomain === referrerDomain) {
        return NextResponse.json(
          { error: 'You cannot use a referral code from someone with the same email provider. Ask a friend with a different email to refer you!' },
          { status: 400 }
        );
      }
      referredBy = normalizedReferralCode;
      // REF-023: Set premium with 1-year expiry
      const premiumExpiry = new Date();
      premiumExpiry.setFullYear(premiumExpiry.getFullYear() + 1);
      await db.user.update({
        where: { id: referrer.id },
        data: { isPremium: true, premiumExpiresAt: premiumExpiry.toISOString() },
      });
      // REF-024: Audit log for premium grants
      console.info(JSON.stringify({
        event: 'referral_premium_granted',
        referrerId: referrer.id,
        referrerEmail: referrer.email,
        referredEmail: normalizedEmail,
        referralCode: normalizedReferralCode,
        premiumExpiresAt: premiumExpiry.toISOString(),
        timestamp: new Date().toISOString(),
      }));
    }

    // Create user with email verified
    const user = await db.user.create({
      data: {
        email: normalizedEmail,
        name,
        password: hashedPassword,
        referralCode: newReferralCode,
        referredBy,
        referredById: referrer?.id || undefined,
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
