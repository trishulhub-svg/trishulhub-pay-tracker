// Migration script to add payRate fields and PayRateHistory table to Turso
const { createClient } = require('@libsql/client');

const TURSO_URL = process.env.TURSO_DATABASE_URL;
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN;

async function main() {
  if (!TURSO_URL || !TURSO_TOKEN) {
    console.error('❌ TURSO_DATABASE_URL and TURSO_AUTH_TOKEN must be set');
    process.exit(1);
  }

  const client = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN });
  console.log('🔗 Connected to Turso database...');
  console.log('📋 Running pay rate migration...');

  // Add payRate column to Company table
  try {
    await client.execute(`ALTER TABLE Company ADD COLUMN payRate REAL NOT NULL DEFAULT 0`);
    console.log('  ✅ Added payRate column to Company table');
  } catch (e) {
    if (String(e).includes('duplicate column')) {
      console.log('  ⚠️  payRate column already exists in Company, skipping.');
    } else {
      console.error('  ❌ Error adding payRate to Company:', String(e));
    }
  }

  // Add payRate column to Shift table
  try {
    await client.execute(`ALTER TABLE Shift ADD COLUMN payRate REAL NOT NULL DEFAULT 0`);
    console.log('  ✅ Added payRate column to Shift table');
  } catch (e) {
    if (String(e).includes('duplicate column')) {
      console.log('  ⚠️  payRate column already exists in Shift, skipping.');
    } else {
      console.error('  ❌ Error adding payRate to Shift:', String(e));
    }
  }

  // Create PayRateHistory table
  try {
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
  } catch (e) {
    console.error('  ❌ Error creating PayRateHistory:', String(e));
  }

  // Create index on PayRateHistory
  try {
    await client.execute(`CREATE INDEX IF NOT EXISTS idx_payrate_companyId ON PayRateHistory(companyId)`);
    await client.execute(`CREATE INDEX IF NOT EXISTS idx_payrate_effectiveFrom ON PayRateHistory(effectiveFrom)`);
    console.log('  ✅ PayRateHistory indexes created');
  } catch (e) {
    console.error('  ❌ Error creating indexes:', String(e));
  }

  console.log('\n🎉 Pay rate migration complete!');
  client.close();
}

main().catch((e) => {
  console.error('❌ Error:', e);
  process.exit(1);
});
