---
Task ID: 1
Agent: Main Agent
Task: Fix all 8 issues for TrishulHub Pay Tracker

Work Log:
- Updated .env with Turso DB credentials (URL + auth token)
- Fixed dark mode: updated tailwind.config.ts content paths from `./pages/**` to `./src/pages/**` (was missing src/ prefix causing Tailwind JIT to not scan source files)
- Fixed dark mode: removed incorrect `@source "../../../src"` from globals.css (TW4 uses `@custom-variant dark`)
- Ran Turso setup script to create all tables and verify DB state
- Fixed `paySlpUrl` typo in Turso PaymentRecord table (renamed to `paySlipUrl`)
- Added missing columns to Turso DB: `User.deactivated`, `Company.payRate`, `Shift.payRate`
- Created PayRateHistory table and indexes in Turso
- Added admin access in Settings view Quick Links for mobile users
- Updated mobile bottom nav: admin users get dedicated Admin + More buttons
- Made login page logo bigger (96x96 vs 72x72), centered "PAY TRACKER" text professionally with tracking-widest
- Added day/month/year picker for pay rate effective date (with toggle to exact date picker)
- Updated shifts API to check pay rate history when creating shifts
- Updated rota PDF API with professional print CSS, weekly summary, XSS protection, user name header
- Updated rota PDF API to use effective pay rates from history
- Improved premium popup: bigger star icon, "Unlock All Premium Features" title, "Refer & Unlock Premium for Life" CTA
- Fixed admin/users API route: replaced direct Turso client with db abstraction for user deletion
- Added `user.delete()` method to db.ts for both Turso and Prisma paths
- Fixed setup-turso.js typo (paySlpUrl → paySlipUrl)
- Generated proper PWA icons (192x192, 512x512, apple-touch-icon)
- Updated manifest.json with proper icon purposes (any + maskable)
- Build verified successfully with no errors

Stage Summary:
- All 8 user issues addressed
- Turso DB fully configured with all required columns
- Dark mode fix: root cause was tailwind.config.ts content paths missing `src/` prefix
- Build passes cleanly
- Ready for GitHub push and Vercel deployment
