// Gift Model - Encapsulates all gift-related database operations

class GiftModel {
  constructor(db) {
    this.db = db;
  }

  /**
   * Map database row to gift object
   */
  mapRowToGift(row) {
    return {
      id: row[0],
      name: row[1],
      description: row[2],
      category: row[3],
      priority: row[4],
      link: row[5],
      image_url: row[6],
      price: row[7],
      reserved: Boolean(row[8]),
      secret_code: row[9],
      reserved_by: row[10],
      reserved_at: row[11],
      status: row[12],
      created_at: row[13]
    };
  }

  /**
   * Sanitize gift for public response (remove secret_code)
   */
  sanitizeGift(gift) {
    if (!gift) return null;
    const { secret_code, ...sanitized } = gift;
    return sanitized;
  }

  /**
   * Escape SQL string
   */
  escapeString(str) {
    if (str === null || str === undefined) return 'NULL';
    return `'${String(str).replace(/'/g, "''")}'`;
  }

  /**
   * Get all gifts with proper priority sorting
   * Priority order: 🔥 Очень хочу > ⭐ Было бы здорово > 💭 Просто мечта
   */
  findAll() {
    const results = this.db.exec(`
      SELECT * FROM gifts
      ORDER BY
        CASE priority
          WHEN '🔥 Очень хочу' THEN 1
          WHEN '⭐ Было бы здорово' THEN 2
          WHEN '💭 Просто мечта' THEN 3
          ELSE 4
        END,
        created_at DESC
    `);

    return results[0] ? results[0].values.map(row => this.mapRowToGift(row)) : [];
  }

  /**
   * Find gift by ID
   */
  findById(id) {
    const results = this.db.exec(`SELECT * FROM gifts WHERE id = ${id}`);
    if (!results[0] || !results[0].values[0]) return null;
    return this.mapRowToGift(results[0].values[0]);
  }

  /**
   * Create new gift
   */
  create(data) {
    const { name, description, category, priority, link, image_url, price } = data;

    const query = `
      INSERT INTO gifts (name, description, category, priority, link, image_url, price)
      VALUES (
        ${this.escapeString(name)},
        ${this.escapeString(description)},
        ${this.escapeString(category)},
        ${this.escapeString(priority)},
        ${this.escapeString(link)},
        ${this.escapeString(image_url)},
        ${this.escapeString(price)}
      )
    `;

    this.db.run(query);

    const lastId = this.db.exec('SELECT last_insert_rowid() as id')[0].values[0][0];
    return this.findById(lastId);
  }

  /**
   * Update gift
   */
  update(id, data) {
    const { name, description, category, priority, link, image_url, price } = data;

    const query = `
      UPDATE gifts
      SET name = ${this.escapeString(name)},
          description = ${this.escapeString(description)},
          category = ${this.escapeString(category)},
          priority = ${this.escapeString(priority)},
          link = ${this.escapeString(link)},
          image_url = ${this.escapeString(image_url)},
          price = ${this.escapeString(price)}
      WHERE id = ${id}
    `;

    this.db.run(query);
    return this.findById(id);
  }

  /**
   * Delete gift
   */
  delete(id) {
    this.db.run(`DELETE FROM gifts WHERE id = ${id}`);
  }

  /**
   * Reserve a gift
   */
  reserve(id, secretCode, reservedBy) {
    const query = `
      UPDATE gifts
      SET reserved = 1,
          secret_code = ${this.escapeString(secretCode)},
          reserved_by = ${this.escapeString(reservedBy || 'Аноним')},
          reserved_at = CURRENT_TIMESTAMP,
          status = 'reserved'
      WHERE id = ${id}
    `;

    this.db.run(query);
    return this.findById(id);
  }

  /**
   * Unreserve a gift
   */
  unreserve(id) {
    const query = `
      UPDATE gifts
      SET reserved = 0,
          secret_code = NULL,
          reserved_by = NULL,
          reserved_at = NULL,
          status = 'available'
      WHERE id = ${id}
    `;

    this.db.run(query);
    return this.findById(id);
  }

  /**
   * Mark gift as purchased
   */
  markPurchased(id) {
    this.db.run(`UPDATE gifts SET status = 'purchased' WHERE id = ${id}`);
    return this.findById(id);
  }
}

module.exports = GiftModel;
