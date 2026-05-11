# ZAI STATE LOG
**Project:** TrishulHub Pay Tracker (pay.trishulhub.com)
**Status:** IN_PROGRESS
**Last Stage:** Stage 2: DO IT ZAI — Batch 3-5 executed and pushed
**Last Action:** Fixed 7 bugs — sign-in speed (PERF-001,002,006), dashboard perf (PERF-005,007), security (SEC-004,005)
**Last Commit:** 609c367
**Next Step:** Batch 6 — remaining MEDIUM/LOW bugs (SEC-001,006, PERF-003,008,009,010, CODE-001-004)

## FIXED BUGS (7)
- [x] PERF-001: AbortController timeout (15s) on all apiFetch calls
- [x] PERF-002: Skip /api/auth/session when no session cookie (login shows instantly)
- [x] PERF-005: Dashboard API — Promise.all for 4 parallel DB queries
- [x] PERF-006: Turso singleton client (was creating new TCP connection per query)
- [x] PERF-007: Companies — GROUP BY count (1 query instead of N+1)
- [x] SEC-004: Timing-safe OTP comparison (crypto.timingSafeEqual)
- [x] SEC-005: Login rate limiting (5 attempts / 15min lockout)

## REMAINING BUGS (10)

### CRITICAL (3)
- SEC-001: Unsalted SHA-256 password hashing — use bcrypt/PBKDF2
- SEC-002: Default SESSION_SECRET in production
- SEC-003: Session payload readable via base64 decode

### HIGH — Performance (3)
- PERF-003: Signup = 3 sequential API calls with spinner
- PERF-004: Dashboard loads ALL records (no pagination)
- PERF-010: Shifts/records GET has no pagination

### MEDIUM (3)
- SEC-006: No file magic-byte validation on import
- PERF-008: No server-side timeout on AI API calls
- PERF-009: Pay rate history loads ALL records

### LOW (4)
- CODE-001: Dead code (isLoading/setIsLoading unused)
- CODE-002: as any type casts in import route
- CODE-003: Auto-migration via ALTER TABLE in production
- CODE-004: No input validation on time format in shifts

---

## PREVIOUSLY COMPLETED
- Batch 1: z.ai import fix, PDF download fix, compact shift UI
- Batch 2: payRate, auto-select company, break memory (already built)
- Batch 3: PERF-006, PERF-001, PERF-002 (sign-in speed)
- Batch 4: PERF-005, PERF-007 (dashboard perf)
- Batch 5: SEC-004, SEC-005 (auth security)
- UI fixes: Hours format (Xh XXm), scrollbar, time picker containment
- 13 TypeScript errors resolved
- All commits pushed to GitHub

## PROJECT INFO
- **GitHub:** https://github.com/trishulhub-svg/trishulhub-pay-tracker.git
- **Stack:** Next.js 16, Turso DB (libSQL), Tailwind CSS v4, Vercel
- **Key Files:** lib/db.ts, lib/session.ts, lib/auth.ts, lib/email.ts, lib/store.ts, src/app/page.tsx, src/app/globals.css
