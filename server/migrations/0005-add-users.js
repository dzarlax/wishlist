/**
 * Migration 0005: Add users table and user_id to gifts
 * Enables multi-user wishlists
 */

module.exports = {
  up(db) {
    // Create users table
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        slug TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        admin_password TEXT NOT NULL,
        avatar_emoji TEXT DEFAULT '🎁',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.run('CREATE INDEX IF NOT EXISTS idx_users_slug ON users (slug)');

    // Add user_id column to gifts (nullable for backward compatibility with existing data)
    db.run('ALTER TABLE gifts ADD COLUMN user_id INTEGER REFERENCES users(id)');
    db.run('CREATE INDEX IF NOT EXISTS idx_gifts_user_id ON gifts (user_id)');
  },

  down(db) {
    // SQLite doesn't support DROP COLUMN easily, so we recreate the table
    db.run('DROP INDEX IF EXISTS idx_gifts_user_id');
    db.run('DROP INDEX IF EXISTS idx_users_slug');
    db.run('DROP TABLE IF EXISTS users');
  }
};
