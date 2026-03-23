// Gift Model - Encapsulates all gift-related database operations

class GiftModel {
  constructor(db, onMutation) {
    this.db = db;
    this._onMutation = onMutation || null;
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
      secret_code: row[9],
      reserved_by: row[10],
      reserved_at: row[11],
      status: row[12],
      created_at: row[13],
      user_id: row[14] || null
    };
  }

  /**
   * Sanitize gift for public response (remove secret_code)
   */
  sanitizeGift(gift) {
    if (!gift) return null;
    // eslint-disable-next-line no-unused-vars
    const { secret_code, ...sanitized } = gift;
    return sanitized;
  }

  /**
   * Save DB to disk after a mutation
   */
  _afterMutation() {
    if (this._onMutation) {
      this._onMutation();
    }
  }

  /**
   * Get all gifts with proper priority sorting
   * Priority order: hot > medium > low
   * @param {number|null} userId - Filter by user ID (null = all gifts)
   */
  findAll(userId = null) {
    if (userId !== null) {
      const stmt = this.db.prepare(`
        SELECT * FROM gifts WHERE user_id = ?
        ORDER BY
          CASE priority_code
            WHEN 'hot' THEN 1
            WHEN 'medium' THEN 2
            WHEN 'low' THEN 3
            ELSE 4
          END,
          created_at DESC
      `);
      try {
        stmt.bind([userId]);
        const results = [];
        while (stmt.step()) {
          results.push(this.mapRowToGift(stmt.getAsObject ? stmt.get() : stmt.get()));
        }
        return results;
      } finally {
        stmt.free();
      }
    }

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
    const stmt = this.db.prepare('SELECT * FROM gifts WHERE id = ?');
    try {
      stmt.bind([id]);
      if (!stmt.step()) return null;
      return this.mapRowToGift(stmt.get());
    } finally {
      stmt.free();
    }
  }

  /**
   * Create new gift
   */
  create(data) {
    const { name, description, category_code, priority_code, link, image_url, price, user_id } = data;

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

    this.db.run(
      `INSERT INTO gifts (name, description, category_code, priority_code, link, image_url, price, user_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [name || null, description || null, categoryCode || null, priorityCode || null, link || null, image_url || null, price || null, user_id || null]
    );
    this._afterMutation();

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

    this.db.run(
      `UPDATE gifts
       SET name = ?, description = ?, category_code = ?, priority_code = ?, link = ?, image_url = ?, price = ?
       WHERE id = ?`,
      [name || null, description || null, categoryCode || null, priorityCode || null, link || null, image_url || null, price || null, id]
    );
    this._afterMutation();

    return this.findById(id);
  }

  /**
   * Delete gift
   */
  delete(id) {
    this.db.run('DELETE FROM gifts WHERE id = ?', [id]);
    this._afterMutation();
  }

  /**
   * Reserve a gift
   */
  reserve(id, secretCode, reservedBy) {
    this.db.run(
      `UPDATE gifts
       SET reserved = 1, secret_code = ?, reserved_by = ?, reserved_at = CURRENT_TIMESTAMP, status = 'reserved'
       WHERE id = ?`,
      [secretCode, reservedBy || 'Аноним', id]
    );
    this._afterMutation();

    return this.findById(id);
  }

  /**
   * Unreserve a gift
   */
  unreserve(id) {
    this.db.run(
      `UPDATE gifts
       SET reserved = 0, secret_code = NULL, reserved_by = NULL, reserved_at = NULL, status = 'available'
       WHERE id = ?`,
      [id]
    );
    this._afterMutation();

    return this.findById(id);
  }

  /**
   * Mark gift as purchased
   */
  markPurchased(id) {
    this.db.run("UPDATE gifts SET status = 'purchased' WHERE id = ?", [id]);
    this._afterMutation();

    return this.findById(id);
  }
}

module.exports = GiftModel;
