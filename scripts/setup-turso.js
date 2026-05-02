// Script to push Prisma schema to Turso database using libSQL client directly
const { createClient } = require('@libsql/client');

const TURSO_URL = process.env.TURSO_DATABASE_URL;
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN;

async function main() {
  if (!TURSO_URL || !TURSO_TOKEN) {
    console.error('❌ TURSO_DATABASE_URL and TURSO_AUTH_TOKEN must be set');
    process.exit(1);
  }

  const client = createClient({
    url: TURSO_URL,
    authToken: TURSO_TOKEN,
  });

  console.log('🔗 Connected to Turso database...');
  console.log('📋 Creating tables...');

  // Create User table
  await client.execute(`
    CREATE TABLE IF NOT EXISTS User (
      id TEXT PRIMARY KEY NOT NULL,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      password TEXT NOT NULL,
      phone TEXT,
      role TEXT NOT NULL DEFAULT 'USER',
      referralCode TEXT NOT NULL UNIQUE,
      referredBy TEXT,
      isPremium BOOLEAN NOT NULL DEFAULT false,
      premiumExpiresAt DATETIME,
      termsAccepted BOOLEAN NOT NULL DEFAULT false,
      termsAcceptedAt DATETIME,
      emailVerified BOOLEAN NOT NULL DEFAULT false,
      deactivated BOOLEAN NOT NULL DEFAULT false,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log('  ✅ User table created');

  // Create Company table
  await client.execute(`
    CREATE TABLE IF NOT EXISTS Company (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      userId TEXT NOT NULL,
      payRate REAL NOT NULL DEFAULT 0,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE,
      UNIQUE(userId, name)
    )
  `);
  console.log('  ✅ Company table created');

  // Create PaymentRecord table
  await client.execute(`
    CREATE TABLE IF NOT EXISTS PaymentRecord (
      id TEXT PRIMARY KEY NOT NULL,
      userId TEXT NOT NULL,
      companyId TEXT NOT NULL,
      month INTEGER NOT NULL,
      year INTEGER NOT NULL,
      totalExpected REAL NOT NULL DEFAULT 0,
      totalReceived REAL NOT NULL DEFAULT 0,
      totalHMRC REAL NOT NULL DEFAULT 0,
      totalDue REAL NOT NULL DEFAULT 0,
      workedHours REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'PENDING',
      notes TEXT,
      paySlpUrl TEXT,
      paySlipName TEXT,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE,
      FOREIGN KEY (companyId) REFERENCES Company(id) ON DELETE CASCADE,
      UNIQUE(userId, companyId, month, year)
    )
  `);
  console.log('  ✅ PaymentRecord table created');

  // Create Shift table
  await client.execute(`
    CREATE TABLE IF NOT EXISTS Shift (
      id TEXT PRIMARY KEY NOT NULL,
      userId TEXT NOT NULL,
      companyId TEXT NOT NULL,
      date TEXT NOT NULL,
      startTime TEXT NOT NULL,
      endTime TEXT NOT NULL,
      breakMinutes INTEGER NOT NULL DEFAULT 0,
      totalHours REAL NOT NULL DEFAULT 0,
      shiftType TEXT NOT NULL DEFAULT 'REGULAR',
      payRate REAL NOT NULL DEFAULT 0,
      notes TEXT,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE,
      FOREIGN KEY (companyId) REFERENCES Company(id) ON DELETE CASCADE
    )
  `);
  console.log('  ✅ Shift table created');

  // Create OtpCode table
  await client.execute(`
    CREATE TABLE IF NOT EXISTS OtpCode (
      id TEXT PRIMARY KEY NOT NULL,
      email TEXT NOT NULL,
      code TEXT NOT NULL,
      type TEXT NOT NULL,
      verified BOOLEAN NOT NULL DEFAULT false,
      expiresAt DATETIME NOT NULL,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      userId TEXT,
      FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE
    )
  `);
  console.log('  ✅ OtpCode table created');

  // Create Setting table (for admin-managed configuration like Brevo SMTP)
  await client.execute(`
    CREATE TABLE IF NOT EXISTS Setting (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL,
      updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log('  ✅ Setting table created');

  // Create PayRateHistory table
  await client.execute(`
    CREATE TABLE IF NOT EXISTS PayRateHistory (
      id TEXT PRIMARY KEY NOT NULL,
      companyId TEXT NOT NULL,
      payRate REAL NOT NULL,
      effectiveFrom TEXT NOT NULL,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (companyId) REFERENCES Company(id) ON DELETE CASCADE
    )
  `);
  console.log('  ✅ PayRateHistory table created');

  // Create indexes for performance
  console.log('📋 Creating indexes...');
  
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_user_email ON User(email)`);
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_user_referral ON User(referralCode)`);
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_company_userId ON Company(userId)`);
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_payment_userId ON PaymentRecord(userId)`);
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_payment_companyId ON PaymentRecord(companyId)`);
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_shift_userId ON Shift(userId)`);
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_shift_companyId ON Shift(companyId)`);
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_shift_date ON Shift(date)`);
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_otp_email ON OtpCode(email)`);
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_otp_expires ON OtpCode(expiresAt)`);
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_payrate_companyId ON PayRateHistory(companyId)`);
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_payrate_effectiveFrom ON PayRateHistory(effectiveFrom)`);
  console.log('  ✅ Indexes created');

  // Seed admin user
  console.log('👤 Seeding admin user...');
  const crypto = require('crypto');
  const passwordHash = crypto.createHash('sha256').update('admin123').digest('hex');
  const referralCode = 'TRISHUL-' + Math.random().toString(36).substring(2, 8).toUpperCase();

  try {
    await client.execute({
      sql: `INSERT INTO User (id, email, name, password, role, referralCode, isPremium, emailVerified, termsAccepted, termsAcceptedAt, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'), datetime('now'))`,
      args: ['admin-001', 'admin@trishulhub.com', 'TrishulHub Admin', passwordHash, 'ADMIN', referralCode, 1, 1, 1],
    });
    console.log('  ✅ Admin user created!');
    console.log('     📧 Email: admin@trishulhub.com');
    console.log('     🔒 Password: admin123');
    console.log('     🎫 Referral Code:', referralCode);
  } catch (e) {
    if (String(e).includes('UNIQUE')) {
      console.log('  ⚠️  Admin user already exists, skipping.');
    } else {
      console.error('  ❌ Error creating admin:', String(e));
    }
  }

  // Verify tables
  console.log('\n🔍 Verifying tables...');
  const tables = await client.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
  for (const row of tables.rows) {
    const count = await client.execute(`SELECT COUNT(*) as cnt FROM "${row.name}"`);
    console.log(`  📊 ${row.name}: ${count.rows[0].cnt} rows`);
  }

  console.log('\n🎉 Turso database setup complete!');
  client.close();
}

main().catch((e) => {
  console.error('❌ Error:', e);
  process.exit(1);
});
