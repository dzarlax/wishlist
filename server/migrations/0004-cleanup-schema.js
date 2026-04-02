// Migration: Clean up schema - remove old category/priority text columns

async function up(db) {
  console.log('    Recreating gifts table with clean schema...');

  if (db.dialect === 'postgres') {
    // PostgreSQL supports DROP COLUMN
    await db.run('ALTER TABLE gifts DROP COLUMN IF EXISTS category');
    await db.run('ALTER TABLE gifts DROP COLUMN IF EXISTS priority');
    await db.run(`ALTER TABLE gifts ALTER COLUMN category_code SET DEFAULT 'electronics'`);
    await db.run(`ALTER TABLE gifts ALTER COLUMN priority_code SET DEFAULT 'medium'`);
    // Update nulls
    await db.run(`UPDATE gifts SET category_code = 'electronics' WHERE category_code IS NULL`);
    await db.run(`UPDATE gifts SET priority_code = 'medium' WHERE priority_code IS NULL`);
  } else {
    // SQLite: recreate table
    await db.run(`
      CREATE TABLE gifts_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        category_code TEXT DEFAULT 'electronics',
        priority_code TEXT DEFAULT 'medium',
        link TEXT,
        image_url TEXT,
        price TEXT,
        reserved INTEGER DEFAULT 0,
        secret_code TEXT,
        reserved_by TEXT,
        reserved_at TEXT,
        status TEXT DEFAULT 'available',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('    Copying data to new table...');
    await db.run(`
      INSERT INTO gifts_new (id, name, description, category_code, priority_code, link, image_url, price, reserved, secret_code, reserved_by, reserved_at, status, created_at)
      SELECT id, name, description,
        COALESCE(category_code, 'electronics'),
        COALESCE(priority_code, 'medium'),
        link, image_url, price, reserved, secret_code, reserved_by, reserved_at, status, created_at
      FROM gifts
    `);

    await db.run('DROP TABLE gifts');
    await db.run('ALTER TABLE gifts_new RENAME TO gifts');
  }

  await db.run('CREATE INDEX IF NOT EXISTS idx_gifts_status ON gifts(status)');
  await db.run('CREATE INDEX IF NOT EXISTS idx_gifts_priority_code ON gifts(priority_code)');
  await db.run('CREATE INDEX IF NOT EXISTS idx_gifts_created_at ON gifts(created_at)');

  console.log('    ✓ Schema cleanup completed');
}

module.exports = { up };
