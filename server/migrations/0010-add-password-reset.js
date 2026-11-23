async function up(db) {
  const postgres = db.dialect === 'postgres';
  async function addColumns(tx) {
    const columns = postgres
      ? await tx.getAll("SELECT column_name AS name FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'users'")
      : await tx.getAll('PRAGMA table_info(users)');
    const existing = new Set(columns.map(column => column.name));
    const definitions = {
      password_reset_hash: 'TEXT',
      password_reset_expires_at: postgres ? 'BIGINT' : 'INTEGER',
      admin_email_override: postgres ? 'BOOLEAN NOT NULL DEFAULT false' : 'INTEGER NOT NULL DEFAULT 0'
    };
    for (const [name, definition] of Object.entries(definitions)) {
      if (!existing.has(name)) await tx.run(`ALTER TABLE users ADD COLUMN ${name} ${definition}`);
    }
    await tx.run('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_password_reset_hash ON users (password_reset_hash)');
  }

  if (postgres) await db.transaction(addColumns);
  else await addColumns(db);
}

module.exports = { up };
