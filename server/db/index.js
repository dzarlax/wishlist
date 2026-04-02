const fs = require('fs');
const path = require('path');
const { SqliteAdapter, PgAdapter } = require('./adapter');

/**
 * Initialize the database adapter based on DATABASE_URL env var.
 * - If DATABASE_URL is set → PostgreSQL via pg Pool
 * - Otherwise → SQLite via sql.js (file-based, in-memory)
 *
 * Returns: { db: adapter, saveDB: function|null }
 */
async function initDatabase(options = {}) {
  const databaseUrl = process.env.DATABASE_URL;

  if (databaseUrl) {
    return initPostgres(databaseUrl);
  }
  return initSqlite(options.dbPath);
}

async function initPostgres(databaseUrl) {
  const { Pool } = require('pg');
  const pool = new Pool({ connectionString: databaseUrl });

  // Test connection
  const client = await pool.connect();
  client.release();
  console.log('🐘 Connected to PostgreSQL');

  const db = new PgAdapter(pool);
  return { db, saveDB: null };
}

async function initSqlite(dbPath) {
  const initSqlJs = require('sql.js');
  const SQL = await initSqlJs();

  const resolvedPath = dbPath || path.join(__dirname, '../../wishlist.db');

  let sqlDb;
  if (fs.existsSync(resolvedPath)) {
    const buffer = fs.readFileSync(resolvedPath);
    sqlDb = new SQL.Database(buffer);
  } else {
    sqlDb = new SQL.Database();
  }

  function saveDB() {
    const data = sqlDb.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(resolvedPath, buffer);
  }

  console.log('📦 Using SQLite database');

  const db = new SqliteAdapter(sqlDb, saveDB);
  return { db, saveDB };
}

module.exports = { initDatabase };
