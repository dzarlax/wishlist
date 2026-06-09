/**
 * Migration 0009: Add invite registration and access flags.
 */

async function up(db) {
  const boolType = db.dialect === 'postgres' ? 'BOOLEAN' : 'INTEGER';
  const falseValue = db.dialect === 'postgres' ? 'false' : '0';
  const trueValue = db.dialect === 'postgres' ? 'true' : '1';
  const idType = db.dialect === 'postgres'
    ? 'SERIAL PRIMARY KEY'
    : 'INTEGER PRIMARY KEY AUTOINCREMENT';
  const timestampType = db.dialect === 'postgres' ? 'TIMESTAMP' : 'TEXT';
  const timestampDefault = db.dialect === 'postgres'
    ? 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP'
    : 'TEXT DEFAULT CURRENT_TIMESTAMP';

  await db.run(`ALTER TABLE users ADD COLUMN is_admin ${boolType} NOT NULL DEFAULT ${falseValue}`);
  await db.run(`ALTER TABLE users ADD COLUMN can_use_ai ${boolType} NOT NULL DEFAULT ${falseValue}`);

  await db.run(`UPDATE users SET can_use_ai = ${trueValue}`);

  const adminUpdate = await db.run(`UPDATE users SET is_admin = ${trueValue} WHERE slug = ?`, ['alexey']);
  if (!adminUpdate.changes) {
    console.warn('⚠️ Initial admin user "alexey" was not found; no admin was assigned');
  }

  await db.run(`
    CREATE TABLE IF NOT EXISTS invites (
      id ${idType},
      token_hash TEXT NOT NULL UNIQUE,
      created_by_user_id INTEGER NOT NULL REFERENCES users(id),
      email TEXT,
      name_hint TEXT,
      can_use_ai ${boolType} NOT NULL DEFAULT ${falseValue},
      expires_at ${timestampType} NOT NULL,
      used_at ${timestampType},
      used_by_user_id INTEGER REFERENCES users(id),
      revoked_at ${timestampType},
      created_at ${timestampDefault}
    )
  `);

  await db.run('CREATE INDEX IF NOT EXISTS idx_invites_token_hash ON invites (token_hash)');
  await db.run('CREATE INDEX IF NOT EXISTS idx_invites_created_by ON invites (created_by_user_id)');
}

module.exports = { up };
