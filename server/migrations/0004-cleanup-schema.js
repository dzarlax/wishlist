// Migration: Clean up schema - remove old category/priority text columns
// This migration recreates the gifts table with only category_code and priority_code

exports.up = function(db) {
  console.log('    Recreating gifts table with clean schema...');

  // Create new table with clean schema
  db.run(`
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

  // Copy data from old table to new table
  db.run(`
    INSERT INTO gifts_new (id, name, description, category_code, priority_code, link, image_url, price, reserved, secret_code, reserved_by, reserved_at, status, created_at)
    SELECT
      id,
      name,
      description,
      COALESCE(category_code, 'electronics') as category_code,
      COALESCE(priority_code, 'medium') as priority_code,
      link,
      image_url,
      price,
      reserved,
      secret_code,
      reserved_by,
      reserved_at,
      status,
      created_at
    FROM gifts
  `);

  console.log('    Dropping old table...');

  // Drop old table
  db.run('DROP TABLE gifts');

  console.log('    Renaming new table...');

  // Rename new table
  db.run('ALTER TABLE gifts_new RENAME TO gifts');

  // Recreate indexes
  db.run('CREATE INDEX IF NOT EXISTS idx_gifts_status ON gifts(status)');
  db.run('CREATE INDEX IF NOT EXISTS idx_gifts_priority_code ON gifts(priority_code)');
  db.run('CREATE INDEX IF NOT EXISTS idx_gifts_created_at ON gifts(created_at)');

  console.log('    ✓ Schema cleanup completed');
};

exports.down = function(db) {
  // Rollback would require recreating old schema with category/priority text columns
  console.log('    Rolling back schema cleanup...');

  db.run(`
    CREATE TABLE gifts_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      category TEXT,
      priority TEXT DEFAULT '⭐ Было бы здорово',
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

  // Copy data back (mapping codes to text)


  // This is a simplified rollback - in reality would need to execute mapping for each row
  db.run(`
    INSERT INTO gifts_new (id, name, description, category, priority, link, image_url, price, reserved, secret_code, reserved_by, reserved_at, status, created_at)
    SELECT id, name, description, NULL, NULL, link, image_url, price, reserved, secret_code, reserved_by, reserved_at, status, created_at
    FROM gifts
  `);

  db.run('DROP TABLE gifts');
  db.run('ALTER TABLE gifts_new RENAME TO gifts');

  db.run('CREATE INDEX IF NOT EXISTS idx_gifts_status ON gifts(status)');
  db.run('CREATE INDEX IF NOT EXISTS idx_gifts_priority ON gifts(priority)');
  db.run('CREATE INDEX IF NOT EXISTS idx_gifts_created_at ON gifts(created_at)');

  console.log('    ✓ Rollback completed');
};
