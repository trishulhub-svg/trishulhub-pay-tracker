// Add `deactivated` column to User table in Turso
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

  // Add deactivated column if it doesn't exist
  try {
    await client.execute(`ALTER TABLE User ADD COLUMN deactivated BOOLEAN NOT NULL DEFAULT 0`);
    console.log('✅ Added "deactivated" column to User table');
  } catch (e) {
    if (String(e).includes('duplicate column')) {
      console.log('⚠️  Column "deactivated" already exists, skipping.');
    } else {
      console.error('❌ Error adding column:', String(e));
    }
  }

  // Verify
  const result = await client.execute('PRAGMA table_info(User)');
  console.log('\n📋 User table columns:');
  for (const row of result.rows) {
    console.log(`  ${row.name} (${row.type}) - default: ${row.dflt_value}`);
  }

  client.close();
  console.log('\n🎉 Migration complete!');
}

main().catch((e) => {
  console.error('❌ Error:', e);
  process.exit(1);
});
