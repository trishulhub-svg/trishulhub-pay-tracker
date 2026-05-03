// Migration script to add client column to Shift table in Turso
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
  console.log('📋 Running client column migration...');

  // Add client column to Shift table
  try {
    await client.execute(`ALTER TABLE Shift ADD COLUMN client TEXT`);
    console.log('  ✅ Added client column to Shift table');
  } catch (e) {
    if (String(e).includes('duplicate column')) {
      console.log('  ⚠️  client column already exists in Shift, skipping.');
    } else {
      console.error('  ❌ Error adding client to Shift:', String(e));
    }
  }

  console.log('\n🎉 Client column migration complete!');
  client.close();
}

main().catch((e) => {
  console.error('❌ Error:', e);
  process.exit(1);
});
