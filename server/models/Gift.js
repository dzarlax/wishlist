// Gift Model - Encapsulates all gift-related database operations

class GiftModel {
  constructor(db) {
    this.db = db;
  }

  // Category code to Russian name mapping (for backward compatibility)
  categoryCodeToName = {
    'electronics': '🔧 Электроника и гаджеты',
    'home': '🏠 Умный дом',
    'accessories': '🔋 Аксессуары',
    'education': '📚 Обучение и развитие',
    'games': '🎮 Игры и развлечения',
    'clothing': '👔 Одежда и стиль',
    'sports': '🏃 Спорт и здоровье',
    'creativity': '🎨 Творчество'
  };

  // Priority code to Russian name mapping (for backward compatibility)
  priorityCodeToName = {
    'hot': '🔥 Очень хочу',
    'medium': '⭐ Было бы здорово',
    'low': '💭 Просто мечта'
  };

  /**
   * Map database row to gift object
   */
  mapRowToGift(row) {
    return {
      id: row[0],
      name: row[1],
      description: row[2],
      category_code: row[3],
      priority_code: row[4],
      link: row[5],
      image_url: row[6],
      price: row[7],
      reserved: Boolean(row[8]),
      _secret_code: row[9],
      reserved_by: row[10],
      reserved_at: row[11],
      status: row[12],
      created_at: row[13]
    };
  }

  /**
   * Sanitize gift for public response (remove _secret_code)
   */
  sanitizeGift(gift) {
    if (!gift) return null;
    // eslint-disable-next-line no-unused-vars
    const { _secret_code, ...sanitized } = gift;
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
   * Priority order: hot > medium > low
   */
  findAll() {
    const results = this.db.exec(`
      SELECT * FROM gifts
      ORDER BY
        CASE priority_code
          WHEN 'hot' THEN 1
          WHEN 'medium' THEN 2
          WHEN 'low' THEN 3
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
    const { name, description, category_code, priority_code, link, image_url, price } = data;

    // Map old text format to codes if needed (for backward compatibility)
    let categoryCode = category_code;
    let priorityCode = priority_code;

    // If old text format is provided, map to code
    if (!categoryCode && data.category) {
      categoryCode = Object.keys(this.categoryCodeToName).find(
        key => this.categoryCodeToName[key] === data.category
      ) || 'electronics';
    }

    if (!priorityCode && data.priority) {
      priorityCode = Object.keys(this.priorityCodeToName).find(
        key => this.priorityCodeToName[key] === data.priority
      ) || 'medium';
    }

    const query = `
      INSERT INTO gifts (name, description, category_code, priority_code, link, image_url, price)
      VALUES (
        ${this.escapeString(name)},
        ${this.escapeString(description)},
        ${this.escapeString(categoryCode)},
        ${this.escapeString(priorityCode)},
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
    const { name, description, category_code, priority_code, link, image_url, price } = data;

    // Map old text format to codes if needed (for backward compatibility)
    let categoryCode = category_code;
    let priorityCode = priority_code;

    // If old text format is provided, map to code
    if (!categoryCode && data.category) {
      categoryCode = Object.keys(this.categoryCodeToName).find(
        key => this.categoryCodeToName[key] === data.category
      ) || 'electronics';
    }

    if (!priorityCode && data.priority) {
      priorityCode = Object.keys(this.priorityCodeToName).find(
        key => this.priorityCodeToName[key] === data.priority
      ) || 'medium';
    }

    const query = `
      UPDATE gifts
      SET name = ${this.escapeString(name)},
          description = ${this.escapeString(description)},
          category_code = ${this.escapeString(categoryCode)},
          priority_code = ${this.escapeString(priorityCode)},
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
          _secret_code = ${this.escapeString(secretCode)},
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
          _secret_code = NULL,
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
