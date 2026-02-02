// Migration: Add priority_code column and migrate existing priorities
// This migration adds a priority_code field to store priority identifiers
// instead of hardcoded translated strings

exports.up = function(db) {
  console.log('    Adding priority_code column...');

  // Add priority_code column (nullable at first for safety)
  db.run('ALTER TABLE gifts ADD COLUMN priority_code TEXT');

  console.log('    Migrating existing priorities to codes...');

  // Get all gifts with priorities
  const gifts = db.exec('SELECT id, priority FROM gifts WHERE priority IS NOT NULL');

  if (gifts[0] && gifts[0].values) {
    // Priority mapping
    const priorityMap = {
      '🔥 Очень хочу': 'hot',
      '⭐ Было бы здорово': 'medium',
      '💭 Просто мечта': 'low'
    };

    // Update each gift
    const stmt = db.prepare('UPDATE gifts SET priority_code = ? WHERE id = ?');

    gifts[0].values.forEach(([id, priority]) => {
      let priorityCode = priorityMap[priority] || 'medium';
      stmt.run(priorityCode, id);
    });

    stmt.free();
  }

  console.log('    ✓ Priority migration completed');
};
