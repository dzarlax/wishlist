class PriorityModel {
  constructor(db) {
    this.db = db;
  }

  async findAll(locale = 'ru') {
    const col = this._nameCol(locale);
    return this.db.getAll(`
      SELECT code, emoji, sort_order,
             COALESCE(${col}, name_ru) as name,
             name_ru, name_en, name_sr
      FROM priorities
      ORDER BY sort_order, code
    `);
  }

  async findByCode(code) {
    return this.db.getOne('SELECT * FROM priorities WHERE code = ?', [code]);
  }

  async create(data) {
    const { code, emoji, sort_order, name_ru, name_en, name_sr } = data;
    await this.db.run(
      'INSERT INTO priorities (code, emoji, sort_order, name_ru, name_en, name_sr) VALUES (?, ?, ?, ?, ?, ?)',
      [code, emoji || '⭐', sort_order || 0, name_ru, name_en || null, name_sr || null]
    );
    return this.findByCode(code);
  }

  async update(code, data) {
    const { emoji, sort_order, name_ru, name_en, name_sr } = data;
    await this.db.run(
      'UPDATE priorities SET emoji = ?, sort_order = ?, name_ru = ?, name_en = ?, name_sr = ? WHERE code = ?',
      [emoji, sort_order, name_ru, name_en || null, name_sr || null, code]
    );
    return this.findByCode(code);
  }

  async delete(code) {
    await this.db.run('DELETE FROM priorities WHERE code = ?', [code]);
  }

  _nameCol(locale) {
    const allowed = ['ru', 'en', 'sr'];
    return allowed.includes(locale) ? `name_${locale}` : 'name_ru';
  }
}

module.exports = PriorityModel;
