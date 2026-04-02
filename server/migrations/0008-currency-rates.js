/**
 * Migration 0008: Add currency_rates table for price sorting
 */

async function up(db) {
  console.log('    Creating currency_rates table...');

  await db.run(`
    CREATE TABLE IF NOT EXISTS currency_rates (
      currency TEXT PRIMARY KEY,
      rate_to_rsd NUMERIC NOT NULL
    )
  `);

  // Approximate rates as of April 2026
  const rates = [
    ['RSD', 1],
    ['EUR', 117],
    ['USD', 108],
  ];

  for (const [currency, rate] of rates) {
    if (db.dialect === 'postgres') {
      await db.run(
        'INSERT INTO currency_rates (currency, rate_to_rsd) VALUES ($1, $2) ON CONFLICT (currency) DO NOTHING',
        [currency, rate]
      );
    } else {
      await db.run(
        'INSERT OR IGNORE INTO currency_rates (currency, rate_to_rsd) VALUES (?, ?)',
        [currency, rate]
      );
    }
  }

  console.log('    ✓ Currency rates added');
}

module.exports = { up };
