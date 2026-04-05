// Gift Model - All database operations are async, using the DB adapter

class GiftModel {
  constructor(db) {
    this.db = db;
  }

  sanitizeGift(gift) {
    if (!gift) return null;
    const { secret_code, ...sanitized } = gift;
    sanitized.reserved = Boolean(sanitized.reserved);
    // Build display price: prefer structured fields, fall back to legacy text
    if (sanitized.price_amount != null) {
      const symbols = { EUR: '€', USD: '$', RSD: 'RSD' };
      const sym = symbols[sanitized.price_currency] || sanitized.price_currency || '';
      sanitized.price_display = `${sanitized.price_amount} ${sym}`.trim();
    } else {
      sanitized.price_display = sanitized.price || null;
    }
    return sanitized;
  }

  /**
   * Get all gifts with proper priority sorting via priorities table.
   * @param {number|null} userId - Filter by user ID (null = all gifts)
   */
  async findAll(userId = null) {
    const sql = `
      SELECT g.*, COALESCE(g.price_amount * cr.rate_to_rsd, NULL) as price_rsd
      FROM gifts g
      LEFT JOIN priorities p ON g.priority_code = p.code
      LEFT JOIN currency_rates cr ON g.price_currency = cr.currency
      ${userId !== null ? 'WHERE g.user_id = ?' : ''}
      ORDER BY COALESCE(p.sort_order, 99), g.created_at DESC
    `;
    const params = userId !== null ? [userId] : [];
    return this.db.getAll(sql, params);
  }

  async findById(id) {
    return this.db.getOne('SELECT * FROM gifts WHERE id = ?', [id]);
  }

  async create(data) {
    const { name, description, category_code, priority_code, link, image_url, price, price_amount, price_currency, user_id } = data;

    const id = await this.db.insert(
      `INSERT INTO gifts (name, description, category_code, priority_code, link, image_url, price, price_amount, price_currency, user_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name || null, description || null, category_code || null, priority_code || null, link || null, image_url || null, price || null, price_amount || null, price_currency || 'EUR', user_id || null]
    );
    return this.findById(id);
  }

  async update(id, data) {
    const { name, description, category_code, priority_code, link, image_url, price, price_amount, price_currency } = data;

    await this.db.run(
      `UPDATE gifts
       SET name = ?, description = ?, category_code = ?, priority_code = ?, link = ?, image_url = ?, price = ?, price_amount = ?, price_currency = ?
       WHERE id = ?`,
      [name || null, description || null, category_code || null, priority_code || null, link || null, image_url || null, price || null, price_amount || null, price_currency || null, id]
    );
    return this.findById(id);
  }

  async delete(id) {
    await this.db.run('DELETE FROM gifts WHERE id = ?', [id]);
  }

  async reserve(id, secretCode, reservedBy) {
    const reservedVal = this.db.dialect === 'postgres' ? true : 1;
    await this.db.run(
      `UPDATE gifts
       SET reserved = ?, secret_code = ?, reserved_by = ?, reserved_at = CURRENT_TIMESTAMP, status = 'reserved'
       WHERE id = ?`,
      [reservedVal, secretCode, reservedBy || 'Аноним', id]
    );
    return this.findById(id);
  }

  async unreserve(id) {
    const reservedVal = this.db.dialect === 'postgres' ? false : 0;
    await this.db.run(
      `UPDATE gifts
       SET reserved = ?, secret_code = NULL, reserved_by = NULL, reserved_at = NULL, status = 'available'
       WHERE id = ?`,
      [reservedVal, id]
    );
    return this.findById(id);
  }

  async markPurchased(id) {
    await this.db.run("UPDATE gifts SET status = 'purchased' WHERE id = ?", [id]);
    return this.findById(id);
  }

  async markGifted(id) {
    await this.db.run("UPDATE gifts SET status = 'gifted' WHERE id = ?", [id]);
    return this.findById(id);
  }

  async countAll() {
    const row = await this.db.getOne('SELECT COUNT(*) as count FROM gifts');
    return row?.count || 0;
  }

  async assignOrphans(userId) {
    const row = await this.db.getOne('SELECT COUNT(*) as count FROM gifts WHERE user_id IS NULL');
    const orphanCount = row?.count || 0;
    if (orphanCount > 0) {
      await this.db.run('UPDATE gifts SET user_id = ? WHERE user_id IS NULL', [userId]);
    }
    return orphanCount;
  }
}

module.exports = GiftModel;
