const fs = require('fs');
const path = require('path');

class MigrationManager {
  constructor(db, migrationsDir) {
    this.db = db;
    this.migrationsDir = migrationsDir;
  }

  /**
   * Initialize migrations table
   */
  init() {
    this.db.run(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        applied_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  /**
   * Get current migration version
   */
  getCurrentVersion() {
    const results = this.db.exec('SELECT MAX(version) as version FROM schema_migrations');
    if (!results[0] || !results[0].values[0] || !results[0].values[0][0]) {
      return 0;
    }
    return results[0].values[0][0];
  }

  /**
   * Get all migration files
   */
  getMigrationFiles() {
    const files = fs.readdirSync(this.migrationsDir)
      .filter(f => f.endsWith('.js'))
      .sort();

    return files.map(f => {
      const match = f.match(/^(\d+)-.+\.js$/);
      return match ? parseInt(match[1]) : null;
    }).filter(Boolean);
  }

  /**
   * Run pending migrations
   */
  async migrate() {
    this.init();

    const currentVersion = this.getCurrentVersion();
    const migrationFiles = this.getMigrationFiles();

    const pendingMigrations = migrationFiles.filter(v => v > currentVersion);

    if (pendingMigrations.length === 0) {
      console.log('✅ Database is up to date');
      return;
    }

    console.log(`📦 Running ${pendingMigrations.length} migration(s)...`);

    for (const version of pendingMigrations) {
      await this.runMigration(version);
    }

    console.log('✅ All migrations completed');
  }

  /**
   * Run a single migration
   */
  async runMigration(version) {
    const file = fs.readdirSync(this.migrationsDir)
      .find(f => f.startsWith(`${String(version).padStart(4, '0')}-`));

    if (!file) {
      throw new Error(`Migration file not found for version ${version}`);
    }

    const migrationPath = path.join(this.migrationsDir, file);
    const migration = require(migrationPath);

    console.log(`  → Running migration ${version}: ${file}`);

    if (typeof migration.up !== 'function') {
      throw new Error(`Migration ${version} must export an 'up' function`);
    }

    // Run migration
    migration.up(this.db);

    // Record migration
    this.db.run(`INSERT INTO schema_migrations (version) VALUES (${version})`);

    console.log(`  ✓ Migration ${version} completed`);
  }
}

module.exports = MigrationManager;
