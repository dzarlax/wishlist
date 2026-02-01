/**
 * Initial schema migration
 * Creates the gifts table
 */

function up(db) {
  db.run(`
    CREATE TABLE IF NOT EXISTS gifts (
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

  // Create index on status for faster filtering
  db.run('CREATE INDEX IF NOT EXISTS idx_gifts_status ON gifts(status)');

  // Create index on priority for faster sorting
  db.run('CREATE INDEX IF NOT EXISTS idx_gifts_priority ON gifts(priority)');

  // Create index on created_at for faster sorting
  db.run('CREATE INDEX IF NOT EXISTS idx_gifts_created_at ON gifts(created_at)');
}

function down(db) {
  db.run('DROP INDEX IF EXISTS idx_gifts_status');
  db.run('DROP INDEX IF EXISTS idx_gifts_priority');
  db.run('DROP INDEX IF EXISTS idx_gifts_created_at');
  db.run('DROP TABLE IF EXISTS gifts');
}

module.exports = { up, down };
