const fs = require('fs');
const path = require('path');

class MigrationManager {
  /**
   * @param {import('../db/adapter').SqliteAdapter|import('../db/adapter').PgAdapter} db - Database adapter
   * @param {string} migrationsDir - Path to migrations directory
   */
  constructor(db, migrationsDir) {
    this.db = db;
    this.migrationsDir = migrationsDir;
  }

  async init() {
    const createTable = this.db.dialect === 'postgres'
      ? `CREATE TABLE IF NOT EXISTS schema_migrations (
           version INTEGER PRIMARY KEY,
           applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
         )`
      : `CREATE TABLE IF NOT EXISTS schema_migrations (
           version INTEGER PRIMARY KEY,
           applied_at TEXT DEFAULT CURRENT_TIMESTAMP
         )`;
    await this.db.run(createTable);
  }

  async getCurrentVersion() {
    const row = await this.db.getOne('SELECT MAX(version) as version FROM schema_migrations');
    return row?.version || 0;
  }

  getMigrationFiles() {
    const files = fs.readdirSync(this.migrationsDir)
      .filter(f => f.endsWith('.js') && !f.includes('migrationManager'))
      .sort();

    return files.map(f => {
      const match = f.match(/^(\d+)-.+\.js$/);
      return match ? parseInt(match[1]) : null;
    }).filter(Boolean);
  }

  async migrate() {
    await this.init();

    const currentVersion = await this.getCurrentVersion();
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

    // Pass db adapter and dialect to migration
    await migration.up(this.db);

    await this.db.run('INSERT INTO schema_migrations (version) VALUES (?)', [version]);

    console.log(`  ✓ Migration ${version} completed`);
  }
}

module.exports = MigrationManager;
