// Migration: Add priority_code column and migrate existing priorities

async function up(db) {
  console.log('    Adding priority_code column...');
  await db.run('ALTER TABLE gifts ADD COLUMN priority_code TEXT');

  console.log('    Migrating existing priorities to codes...');
  const gifts = await db.getAll('SELECT id, priority FROM gifts WHERE priority IS NOT NULL');

  const priorityMap = {
    '🔥 Очень хочу': 'hot',
    '⭐ Было бы здорово': 'medium',
    '💭 Просто мечта': 'low'
  };

  for (const gift of gifts) {
    const priorityCode = priorityMap[gift.priority] || 'medium';
    await db.run('UPDATE gifts SET priority_code = ? WHERE id = ?', [priorityCode, gift.id]);
  }

  console.log('    ✓ Priority migration completed');
}

module.exports = { up };
