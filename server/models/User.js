class UserModel {
  constructor(db, onMutation) {
    this.db = db;
    this._onMutation = onMutation || null;
  }

  _afterMutation() {
    if (this._onMutation) {
      this._onMutation();
    }
  }

  mapRowToUser(row) {
    return {
      id: row[0],
      slug: row[1],
      name: row[2],
      admin_password: row[3],
      avatar_emoji: row[4],
      created_at: row[5]
    };
  }

  sanitizeUser(user) {
    if (!user) return null;
    const { admin_password, ...sanitized } = user;
    return sanitized;
  }

  findAll() {
    const results = this.db.exec('SELECT * FROM users ORDER BY created_at ASC');
    return results[0] ? results[0].values.map(row => this.mapRowToUser(row)) : [];
  }

  findBySlug(slug) {
    const stmt = this.db.prepare('SELECT * FROM users WHERE slug = ?');
    try {
      stmt.bind([slug]);
      if (!stmt.step()) return null;
      return this.mapRowToUser(stmt.get());
    } finally {
      stmt.free();
    }
  }

  findById(id) {
    const stmt = this.db.prepare('SELECT * FROM users WHERE id = ?');
    try {
      stmt.bind([id]);
      if (!stmt.step()) return null;
      return this.mapRowToUser(stmt.get());
    } finally {
      stmt.free();
    }
  }

  create(data) {
    const { slug, name, admin_password, avatar_emoji } = data;
    this.db.run(
      'INSERT INTO users (slug, name, admin_password, avatar_emoji) VALUES (?, ?, ?, ?)',
      [slug, name, admin_password, avatar_emoji || '🎁']
    );
    this._afterMutation();
    return this.findBySlug(slug);
  }

  upsert(data) {
    const existing = this.findBySlug(data.slug);
    if (existing) {
      // Update name and password if changed
      this.db.run(
        'UPDATE users SET name = ?, admin_password = ?, avatar_emoji = ? WHERE slug = ?',
        [data.name, data.admin_password, data.avatar_emoji || existing.avatar_emoji, data.slug]
      );
      this._afterMutation();
      return this.findBySlug(data.slug);
    }
    return this.create(data);
  }
}

module.exports = UserModel;
