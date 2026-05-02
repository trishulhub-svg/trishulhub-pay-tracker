---
Task ID: 1
Agent: Main Agent
Task: Fix dashboard not loading, company add error, dark mode issues, and SMTP notice visibility

Work Log:
- Analyzed entire codebase to identify root causes of all reported issues
- Found critical bug: db.ts Turso path didn't support Prisma features like _count, compound uniques, select, array orderBy
- Dashboard crashed because c._count.paymentRecords was undefined (Turso path ignored include/_count)
- Company add could fail because findUnique({ where: { userId_name } }) always queried by id only
- Login route bypassed db.ts using direct libsql client (inconsistent)
- Session/referrals routes used select parameter which was ignored in Turso path
- Boolean values (isPremium etc.) weren't properly converted between JS (true/false) and SQL (1/0)
- SMTP notice cards had poor visibility in dark mode due to low contrast colors
- Admin tab switcher had bg-background which could be invisible in dark mode

- Rewrote db.ts with comprehensive fixes:
  - Added buildWhereConditions() helper with boolean conversion (toSqlValue)
  - Added buildOrderBy() helper supporting both single and array orderBy
  - Added mapUserRow() to convert boolean fields from DB
  - company.findUnique now supports { where: { userId_name: { userId, name } } } compound unique
  - paymentRecord.findUnique now supports { where: { userId_companyId_month_year: { ... } } } compound unique
  - company.findMany now supports include._count.select.paymentRecords (does separate count queries)
  - user.findUnique now supports select parameter to filter returned fields
  - All findUnique methods support both { where: { id } } and { id } calling patterns
  - All where condition builders handle null, { not: null }, { gte }, { lte }, { lt }, { in }, { contains }

- Fixed login route: replaced direct @libsql/client with db.user.findUnique
- Fixed dashboard route: added Number() coercion for numeric fields, safe _count fallback
- Fixed session route: added !! for isPremium boolean conversion
- Fixed referrals route: added !! for isPremium boolean conversion
- Fixed admin route: ensured recentSignups boolean fields are properly converted
- Fixed SMTP notice visibility: changed from Card components to styled divs with better dark mode contrast
- Fixed admin tab switcher: changed bg-background to bg-card with border for dark mode visibility
- Fixed status indicator: added dark: variants for green/red dots

Stage Summary:
- All API routes now properly work with Turso database in production
- Dashboard should load without errors
- Company creation should work without internal server errors
- Dark mode should have better visibility especially for SMTP notice cards
- Build passes successfully
