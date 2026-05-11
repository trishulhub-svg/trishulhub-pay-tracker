# ZAI STATE LOG
**Project:** TrishulHub Pay Tracker (pay.trishulhub.com)
**Status:** IN_PROGRESS
**Last Stage:** Stage 1: TOTAL ZAI — Full audit complete, bug list produced
**Last Action:** Deep audit of ALL pages — 17 bugs found (3 CRITICAL, 7 HIGH, 6 MEDIUM, 4 LOW)
**Next Step:** Stage 2: DO IT ZAI — Organize batches from audit findings
**Pending Batches:** TBD (planning stage next)
**Active Bug List:**

### CRITICAL (3)
- SEC-001: Unsalted SHA-256 password hashing — use bcrypt
- SEC-002: Default SESSION_SECRET in production
- SEC-003: Session payload readable via base64 decode

### HIGH — Performance (7)
- PERF-001: No AbortController timeout on apiFetch
- PERF-002: Hydration gate blocks entire UI on /api/auth/session
- PERF-003: Signup = 3 sequential API calls with spinner
- PERF-004: Dashboard loads ALL records (no pagination)
- PERF-005: Dashboard: 4 sequential DB queries (should be Promise.all)
- PERF-006: No Turso connection pooling (new client every request)
- PERF-007: N+1 company count queries (should use GROUP BY)

### MEDIUM — Security + Performance (6)
- SEC-004: No timing-safe OTP comparison
- SEC-005: No login rate limiting
- SEC-006: No file magic-byte validation on import
- PERF-008: No server-side timeout on AI API calls
- PERF-009: Pay rate history loads ALL records
- PERF-010: Shifts/records GET has no pagination

### LOW (4)
- CODE-001: Dead code (isLoading/setIsLoading unused)
- CODE-002: as any type casts in import route
- CODE-003: Auto-migration via ALTER TABLE in production
- CODE-004: No input validation on time format in shifts

---

## PREVIOUSLY COMPLETED
- Batch 1: z.ai import fix, PDF download fix, compact shift UI
- Batch 2: payRate, auto-select company, break memory (already built)
- UI fixes: Hours format (Xh XXm), scrollbar, time picker containment
- 13 TypeScript errors resolved
- All commits pushed to GitHub

## PROJECT INFO
- **GitHub:** https://github.com/trishulhub-svg/trishulhub-pay-tracker.git
- **Stack:** Next.js 16, Turso DB (libSQL), Tailwind CSS v4, Vercel
- **Key Files:** lib/db.ts, lib/session.ts, lib/auth.ts, lib/email.ts, lib/store.ts, src/app/page.tsx, src/app/globals.css
