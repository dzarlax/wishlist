/**
 * Migration 0007: Add price_amount and price_currency columns, parse existing prices
 */

async function up(db) {
  console.log('    Adding price_amount and price_currency columns...');
  await db.run('ALTER TABLE gifts ADD COLUMN price_amount NUMERIC');
  await db.run("ALTER TABLE gifts ADD COLUMN price_currency TEXT DEFAULT 'EUR'");

  // Parse existing prices into structured fields
  console.log('    Parsing existing prices...');

  // EUR: "92 €", "1.195 €", "80 EUR", "138 €"
  await db.run(`UPDATE gifts SET price_currency = 'EUR' WHERE price LIKE '%€%' OR price LIKE '%EUR%'`);
  // USD: "$3,999.00", "20$", "26.40$"
  await db.run(`UPDATE gifts SET price_currency = 'USD' WHERE price LIKE '%$%' OR price LIKE '%USD%'`);
  // RSD: "18.990 RSD", "1,708.66 RSD"
  await db.run(`UPDATE gifts SET price_currency = 'RSD' WHERE price LIKE '%RSD%'`);
  // Bare numbers default to RSD
  await db.run(`UPDATE gifts SET price_currency = 'RSD' WHERE price IS NOT NULL AND price_currency = 'EUR' AND price NOT LIKE '%€%' AND price NOT LIKE '%EUR%' AND price NOT LIKE '%$%' AND price NOT LIKE '%USD%' AND price NOT LIKE '%RSD%'`);

  // Now extract numeric values — fetch and update in code since regex replace differs between PG and SQLite
  const gifts = await db.getAll('SELECT id, price FROM gifts WHERE price IS NOT NULL');
  for (const gift of gifts) {
    const amount = extractNumber(gift.price);
    if (amount !== null) {
      await db.run('UPDATE gifts SET price_amount = ? WHERE id = ?', [amount, gift.id]);
    }
  }

  console.log('    ✓ Price migration completed');
}

function extractNumber(str) {
  if (!str) return null;
  // Remove currency symbols, text, and extras like "+ доставка"
  let s = str.replace(/[€$]/g, '').replace(/\b(EUR|USD|RSD)\b/gi, '').replace(/\+.*$/, '').trim();
  if (!s) return null;

  // US format: 3,999.00
  if (/^\d{1,3}(,\d{3})*(\.\d+)?$/.test(s)) {
    return parseFloat(s.replace(/,/g, ''));
  }
  // European thousands: 1.195 or 18.990 (dot groups of 3)
  if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
    return parseFloat(s.replace(/\./g, ''));
  }
  // Simple number: 5000, 26.40
  const n = parseFloat(s.replace(/,/g, ''));
  return isNaN(n) ? null : n;
}

module.exports = { up };
