// Migration: Add category_code column and migrate existing categories
// This migration adds a category_code field to store category identifiers
// instead of hardcoded translated strings

exports.up = function(db) {
  console.log('    Adding category_code column...');

  // Add category_code column (nullable at first for safety)
  db.run(`ALTER TABLE gifts ADD COLUMN category_code TEXT`);

  console.log('    Migrating existing categories to codes...');

  // Get all gifts with categories
  const gifts = db.exec('SELECT id, category FROM gifts WHERE category IS NOT NULL');

  if (gifts[0] && gifts[0].values) {
    // Category mapping
    const categoryMap = {
      '🔧 Электроника и гаджеты': 'electronics',
      '🏠 Умный дом': 'home',
      '🔋 Аксессуары': 'accessories',
      '📚 Обучение и развитие': 'education',
      '🎮 Игры и развлечения': 'games',
      '👔 Одежда и стиль': 'clothing',
      '🏃 Спорт и здоровье': 'sports',
      '🎨 Творчество': 'creativity'
    };

    const emojiMap = {
      '🔧': 'electronics',
      '🏠': 'home',
      '🔋': 'accessories',
      '📚': 'education',
      '🎮': 'games',
      '👔': 'clothing',
      '🏃': 'sports',
      '🎨': 'creativity'
    };

    // Update each gift
    const stmt = db.prepare('UPDATE gifts SET category_code = ? WHERE id = ?');

    gifts[0].values.forEach(([id, category]) => {
      let categoryCode = categoryMap[category];

      // If not found in map, try by emoji
      if (!categoryCode) {
        const emoji = category.charAt(0);
        categoryCode = emojiMap[emoji] || 'other';
      }

      stmt.run(categoryCode, id);
    });

    stmt.free();
  }

  console.log('    ✓ Category migration completed');
};

