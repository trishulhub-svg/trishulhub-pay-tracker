---
Task ID: 1
Agent: Main Agent
Task: Fix dark mode, add PWA, pay rates, shift rota PDF, premium popup, admin mobile access, login page logo

Work Log:
- Fixed dark mode: Updated @custom-variant dark to use `&:is(.dark *)`, added `color-scheme` CSS property, added `@plugin "tailwindcss-animate"`, improved inline theme script to set colorScheme
- Added admin button to mobile bottom nav for ADMIN role users
- Created PWA manifest.json with icons (logo-192.png, apple-touch-icon.png)
- Updated login page with larger centered logo (72x72) and professional layout
- Added pay rate system: Company payRate field, Shift payRate override, PayRateHistory table
- Updated CompanyFormView with pay rate input field
- Updated CompaniesView with pay rate display and update dialog (with effective date)
- Updated ShiftDaySheet with custom rate toggle and earnings estimation
- Created /api/shifts/rota-pdf endpoint for shift rota PDF generation
- Added download rota button to ShiftsView with free/premium flow
- Created PremiumFeaturePopup component for premium upsell
- Updated DB schema (prisma + Turso) with new columns/tables
- Created migration script: scripts/add-payrate-columns.js

Stage Summary:
- Build passes successfully
- Pushed to GitHub: commit c0e4cda
- User needs to run: `node scripts/add-payrate-columns.js` with Turso credentials to add new columns to existing database
