#!/usr/bin/env node

/**
 * Migrate data from SQLite (wishlist.db) to PostgreSQL.
 *
 * Usage:
 *   DATABASE_URL=postgres://... node scripts/migrate-sqlite-to-pg.js [path/to/wishlist.db]
 *
 * This script:
 *  1. Reads all users and gifts from SQLite
 *  2. Inserts them into PostgreSQL (which should already have schema from migrations)
 *  3. Preserves IDs, timestamps, and relationships
 *  4. Skips if data already exists in PG
 */

const { Pool } = require('pg');
const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = process.argv[2] || path.join(__dirname, '../wishlist.db');
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL is required');
  process.exit(1);
}

if (!fs.existsSync(DB_PATH)) {
  console.error(`❌ SQLite file not found: ${DB_PATH}`);
  process.exit(1);
}

async function main() {
  // Connect to SQLite
  const SQL = await initSqlJs();
  const buffer = fs.readFileSync(DB_PATH);
  const sqliteDb = new SQL.Database(buffer);

  // Connect to PostgreSQL
  const pool = new Pool({ connectionString: DATABASE_URL });
  const client = await pool.connect();

  try {
    // Check if PG already has data
    const existingUsers = await client.query('SELECT COUNT(*) as count FROM users');
    if (parseInt(existingUsers.rows[0].count) > 0) {
      console.log('⚠️  PostgreSQL already has users. Skipping migration to avoid duplicates.');
      console.log('   If you want to re-migrate, truncate the tables first.');
      return;
    }

    await client.query('BEGIN');

    // --- Migrate users ---
    const usersResult = sqliteDb.exec('SELECT id, slug, name, admin_password, avatar_emoji, created_at FROM users ORDER BY id');
    if (usersResult[0]) {
      console.log(`👤 Migrating ${usersResult[0].values.length} users...`);
      for (const row of usersResult[0].values) {
        const [id, slug, name, admin_password, avatar_emoji, created_at] = row;
        await client.query(
          `INSERT INTO users (id, slug, name, admin_password, avatar_emoji, created_at)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [id, slug, name, admin_password, avatar_emoji || '🎁', created_at]
        );
        console.log(`   ✓ ${slug} (${name})`);
      }
      // Reset sequence to max id
      await client.query(`SELECT setval('users_id_seq', (SELECT MAX(id) FROM users))`);
    }

    // --- Migrate gifts ---
    const giftsResult = sqliteDb.exec(`
      SELECT id, name, description, category_code, priority_code, link, image_url,
             price, reserved, secret_code, reserved_by, reserved_at, status, created_at, user_id
      FROM gifts ORDER BY id
    `);
    if (giftsResult[0]) {
      console.log(`🎁 Migrating ${giftsResult[0].values.length} gifts...`);
      for (const row of giftsResult[0].values) {
        const [id, name, description, category_code, priority_code, link, image_url,
               price, reserved, secret_code, reserved_by, reserved_at, status, created_at, user_id] = row;
        await client.query(
          `INSERT INTO gifts (id, name, description, category_code, priority_code, link, image_url,
                              price, reserved, secret_code, reserved_by, reserved_at, status, created_at, user_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
          [id, name, description, category_code, priority_code, link, image_url,
           price, Boolean(reserved), secret_code, reserved_by, reserved_at, status, created_at, user_id]
        );
      }
      // Reset sequence
      await client.query(`SELECT setval('gifts_id_seq', (SELECT MAX(id) FROM gifts))`);
      console.log(`   ✓ ${giftsResult[0].values.length} gifts migrated`);
    }

    await client.query('COMMIT');
    console.log('\n✅ Migration complete!');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
    sqliteDb.close();
  }
}

main().catch(() => process.exit(1));
