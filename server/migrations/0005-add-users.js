/**
 * Migration 0005: Add users table and user_id to gifts
 */

async function up(db) {
  const idType = db.dialect === 'postgres'
    ? 'SERIAL PRIMARY KEY'
    : 'INTEGER PRIMARY KEY AUTOINCREMENT';

  const timestampDefault = db.dialect === 'postgres'
    ? 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP'
    : 'TEXT DEFAULT CURRENT_TIMESTAMP';

  await db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id ${idType},
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      admin_password TEXT NOT NULL,
      avatar_emoji TEXT DEFAULT '🎁',
      created_at ${timestampDefault}
    )
  `);

  await db.run('CREATE INDEX IF NOT EXISTS idx_users_slug ON users (slug)');

  await db.run('ALTER TABLE gifts ADD COLUMN user_id INTEGER REFERENCES users(id)');
  await db.run('CREATE INDEX IF NOT EXISTS idx_gifts_user_id ON gifts (user_id)');
}

async function down(db) {
  await db.run('DROP INDEX IF EXISTS idx_gifts_user_id');
  await db.run('DROP INDEX IF EXISTS idx_users_slug');
  await db.run('DROP TABLE IF EXISTS users');
}

module.exports = { up, down };
