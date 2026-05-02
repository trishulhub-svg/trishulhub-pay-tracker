---
Task ID: 2
Agent: Main
Task: Major rework - dark mode fix, mobile-first, OTP signup, weekly shifts, referral links, password reset

Work Log:
- Updated Prisma schema: added OtpCode model, emailVerified field on User, removed location from Shift
- Created email-validation.ts: disposable email blocker with 500+ temp domain list, email format validation
- Created email.ts: Brevo SMTP API integration, OTP generation, HTML email templates (signup + password reset)
- Created API routes: /api/auth/send-otp, /api/auth/verify-otp, /api/auth/forgot-password, /api/auth/reset-password
- Updated signup API: now requires OTP verification before account creation, blocks disposable emails
- Updated shifts API: removed location field from create/update
- Rewrote page.tsx (3000+ lines) with:
  - Fixed dark mode: all components use semantic CSS variables with dark: variants
  - Mobile-first design: bottom nav, full-width forms, touch-friendly targets
  - OTP-based signup: 3-step flow (Details → Verify OTP → Done)
  - Referral link system: ?ref=CODE auto-fills signup form
  - Password reset: forgot password → OTP → new password
  - Weekly shift calendar: Mon-Sun layout, week navigation, daily shift cards
  - DEV MODE banner shows OTP code when Brevo API key not set
- Updated seed.ts: current week shift data for weekly view demo
- Added .env entries: BREVO_API_KEY, BREVO_FROM_EMAIL, BREVO_FROM_NAME
- Build passes successfully with all 20 API routes

Stage Summary:
- All new features implemented and building successfully
- Admin: admin@trishulhub.com / admin123
- Demo: demo@trishulhub.com / demo123
- OTP flow works in dev mode (shows code in banner when Brevo not configured)
- User needs to provide Brevo API key in .env for production email sending
