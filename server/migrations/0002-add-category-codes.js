// Migration: Add category_code column and migrate existing categories

async function up(db) {
  console.log('    Adding category_code column...');
  await db.run('ALTER TABLE gifts ADD COLUMN category_code TEXT');

  console.log('    Migrating existing categories to codes...');
  const gifts = await db.getAll('SELECT id, category FROM gifts WHERE category IS NOT NULL');

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

  for (const gift of gifts) {
    let categoryCode = categoryMap[gift.category];
    if (!categoryCode) {
      const emoji = gift.category.charAt(0);
      categoryCode = emojiMap[emoji] || 'other';
    }
    await db.run('UPDATE gifts SET category_code = ? WHERE id = ?', [categoryCode, gift.id]);
  }

  console.log('    ✓ Category migration completed');
}

module.exports = { up };
