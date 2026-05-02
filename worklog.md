---
Task ID: 1
Agent: Main
Task: Complete TrishulHub Pay Tracker rework with new features

Work Log:
- Updated Prisma schema with Shift model, admin role (role field on User), terms acceptance fields
- Applied schema with `prisma db push --force-reset` and regenerated client
- Updated session.ts to include `role` field in SessionUser
- Updated store.ts with new view types (shifts, add-shift, edit-shift, admin) and selectedShiftId
- Updated signup API route: requires termsAccepted=true, fixed referral logic (only referrer gets premium)
- Updated login API route: includes role in session token
- Updated session API route: returns fresh role from DB
- Created shifts API routes: GET/POST /api/shifts, PUT/DELETE /api/shifts/[id], GET /api/shifts/hours
- Created admin API route: GET /api/admin (returns stats, recentSignups, monthlySignups - NO personal data)
- Updated dashboard API route: includes shiftSummary for current month
- Rewrote page.tsx (2742 lines) with all new features:
  - UK-standard Terms & Conditions dialog at signup (must be accepted)
  - Referral logic: only referrer gets premium (not the referred user)
  - Admin Dashboard view (only for ADMIN role users)
  - Full Shift Tracker (like ProdHours): shift types, break tracking, auto-hours calculation, overnight shifts
  - Auto-populate worked hours in payment form from shift data
  - Working dark/light mode with next-themes
  - TrishulHub branding throughout
- Updated seed.ts with admin account (admin@trishulhub.com / admin123), demo user, shift data
- Verified build passes successfully with all 17 API routes

Stage Summary:
- Admin account: admin@trishulhub.com / admin123
- Demo account: demo@trishulhub.com / demo123
- All features implemented: T&C, referral fix, admin dashboard, shift tracker, auto-populate hours, dark mode
- Build compiles successfully with zero errors
