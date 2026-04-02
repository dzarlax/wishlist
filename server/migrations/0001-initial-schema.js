/**
 * Initial schema migration
 * Creates the gifts table
 */

async function up(db) {
  const idType = db.dialect === 'postgres'
    ? 'SERIAL PRIMARY KEY'
    : 'INTEGER PRIMARY KEY AUTOINCREMENT';

  await db.run(`
    CREATE TABLE IF NOT EXISTS gifts (
      id ${idType},
      name TEXT NOT NULL,
      description TEXT,
      category TEXT,
      priority TEXT DEFAULT '⭐ Было бы здорово',
      link TEXT,
      image_url TEXT,
      price TEXT,
      reserved ${db.dialect === 'postgres' ? 'BOOLEAN DEFAULT FALSE' : 'INTEGER DEFAULT 0'},
      secret_code TEXT,
      reserved_by TEXT,
      reserved_at TEXT,
      status TEXT DEFAULT 'available',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.run('CREATE INDEX IF NOT EXISTS idx_gifts_status ON gifts(status)');
  await db.run('CREATE INDEX IF NOT EXISTS idx_gifts_priority ON gifts(priority)');
  await db.run('CREATE INDEX IF NOT EXISTS idx_gifts_created_at ON gifts(created_at)');
}

async function down(db) {
  await db.run('DROP INDEX IF EXISTS idx_gifts_status');
  await db.run('DROP INDEX IF EXISTS idx_gifts_priority');
  await db.run('DROP INDEX IF EXISTS idx_gifts_created_at');
  await db.run('DROP TABLE IF EXISTS gifts');
}

module.exports = { up, down };
