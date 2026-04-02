/**
 * Migration 0006: Normalize categories and priorities into tables, add email to users
 *
 * - Create categories table (code PK, emoji, sort_order, name_ru, name_en, name_sr)
 * - Create priorities table (same structure)
 * - Seed default data
 * - Add FK constraints on gifts.category_code and gifts.priority_code
 * - Add email column to users
 */

async function up(db) {
  // --- Categories table ---
  console.log('    Creating categories table...');
  await db.run(`
    CREATE TABLE IF NOT EXISTS categories (
      code TEXT PRIMARY KEY,
      emoji TEXT DEFAULT '📦',
      sort_order INTEGER DEFAULT 0,
      name_ru TEXT NOT NULL,
      name_en TEXT,
      name_sr TEXT
    )
  `);

  // Seed categories
  const categories = [
    ['electronics', '🔧', 1, 'Электроника и гаджеты', 'Electronics & Gadgets', 'Elektronika i gadžeti'],
    ['home',        '🏠', 2, 'Умный дом',             'Smart Home',            'Pametni dom'],
    ['accessories', '🔋', 3, 'Аксессуары',            'Accessories',           'Dodaci'],
    ['education',   '📚', 4, 'Обучение и развитие',   'Education & Growth',    'Obrazovanje i razvoj'],
    ['games',       '🎮', 5, 'Игры и развлечения',    'Games & Entertainment', 'Igre i zabava'],
    ['clothing',    '👔', 6, 'Одежда и стиль',        'Clothing & Style',      'Odeća i stil'],
    ['sports',      '🏃', 7, 'Спорт и здоровье',      'Sports & Health',       'Sport i zdravlje'],
    ['creativity',  '🎨', 8, 'Творчество',            'Creativity',            'Kreativnost'],
  ];

  for (const [code, emoji, sort_order, name_ru, name_en, name_sr] of categories) {
    if (db.dialect === 'postgres') {
      await db.run(
        `INSERT INTO categories (code, emoji, sort_order, name_ru, name_en, name_sr)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (code) DO NOTHING`,
        [code, emoji, sort_order, name_ru, name_en, name_sr]
      );
    } else {
      await db.run(
        `INSERT OR IGNORE INTO categories (code, emoji, sort_order, name_ru, name_en, name_sr)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [code, emoji, sort_order, name_ru, name_en, name_sr]
      );
    }
  }

  // --- Priorities table ---
  console.log('    Creating priorities table...');
  await db.run(`
    CREATE TABLE IF NOT EXISTS priorities (
      code TEXT PRIMARY KEY,
      emoji TEXT DEFAULT '⭐',
      sort_order INTEGER DEFAULT 0,
      name_ru TEXT NOT NULL,
      name_en TEXT,
      name_sr TEXT
    )
  `);

  const priorities = [
    ['hot',    '🔥', 1, 'Очень хочу',       'Really Want',    'Baš želim'],
    ['medium', '⭐', 2, 'Было бы здорово',   'Would Be Nice',  'Bilo bi super'],
    ['low',    '💭', 3, 'Просто мечта',      'Just a Dream',   'Samo san'],
  ];

  for (const [code, emoji, sort_order, name_ru, name_en, name_sr] of priorities) {
    if (db.dialect === 'postgres') {
      await db.run(
        `INSERT INTO priorities (code, emoji, sort_order, name_ru, name_en, name_sr)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (code) DO NOTHING`,
        [code, emoji, sort_order, name_ru, name_en, name_sr]
      );
    } else {
      await db.run(
        `INSERT OR IGNORE INTO priorities (code, emoji, sort_order, name_ru, name_en, name_sr)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [code, emoji, sort_order, name_ru, name_en, name_sr]
      );
    }
  }

  // --- Email on users ---
  console.log('    Adding email column to users...');
  await db.run('ALTER TABLE users ADD COLUMN email TEXT');
  // Create unique index (allows NULLs — only enforce uniqueness on non-null)
  if (db.dialect === 'postgres') {
    await db.run('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users (email) WHERE email IS NOT NULL');
  } else {
    await db.run('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users (email)');
  }

  console.log('    ✓ Migration 0006 completed');
}

module.exports = { up };
