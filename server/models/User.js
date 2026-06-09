const bcrypt = require('bcryptjs');

class UserModel {
  constructor(db) {
    this.db = db;
  }

  sanitizeUser(user) {
    if (!user) return null;
    const sanitized = { ...user };
    delete sanitized.admin_password;
    sanitized.is_admin = Boolean(sanitized.is_admin);
    sanitized.can_use_ai = Boolean(sanitized.can_use_ai);
    return sanitized;
  }

  async findAll() {
    return this.db.getAll('SELECT * FROM users ORDER BY created_at ASC');
  }

  async findBySlug(slug) {
    return this.db.getOne('SELECT * FROM users WHERE slug = ?', [slug]);
  }

  async findById(id) {
    return this.db.getOne('SELECT * FROM users WHERE id = ?', [id]);
  }

  async findByEmail(email) {
    return this.db.getOne('SELECT * FROM users WHERE email = ?', [email]);
  }

  async create(data) {
    const { slug, name, admin_password, avatar_emoji, email, is_admin, can_use_ai } = data;
    const hashedPassword = await bcrypt.hash(admin_password, 10);

    await this.db.insert(
      `INSERT INTO users (slug, name, admin_password, avatar_emoji, email, is_admin, can_use_ai)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [slug, name, hashedPassword, avatar_emoji || '🎁', email || null, Boolean(is_admin), Boolean(can_use_ai)]
    );
    return this.findBySlug(slug);
  }

  /**
   * Seed a user: create if not exists, update if exists.
   * Hashes password on create. On update, only rehashes if password changed.
   */
  async seed(data) {
    const existing = await this.findBySlug(data.slug);
    if (existing) {
      // Only update name, emoji, email — don't overwrite password if it was changed via UI
      const accessFields = [];
      const accessParams = [];
      if (data.is_admin !== undefined && !existing.is_admin) {
        accessFields.push('is_admin = ?');
        accessParams.push(Boolean(data.is_admin));
      }
      if (data.can_use_ai !== undefined && !existing.can_use_ai) {
        accessFields.push('can_use_ai = ?');
        accessParams.push(Boolean(data.can_use_ai));
      }
      await this.db.run(
        `UPDATE users SET name = ?, avatar_emoji = ?, email = ?${accessFields.length ? `, ${accessFields.join(', ')}` : ''} WHERE slug = ?`,
        [
          data.name,
          data.avatar_emoji || existing.avatar_emoji,
          data.email || existing.email,
          ...accessParams,
          data.slug
        ]
      );
      return this.findBySlug(data.slug);
    }
    return this.create(data);
  }

  async verifyPassword(user, password) {
    // Support both hashed and legacy plain-text passwords
    if (user.admin_password.startsWith('$2')) {
      return bcrypt.compare(password, user.admin_password);
    }
    // Legacy plain-text comparison (will be hashed on next seed)
    return user.admin_password === password;
  }

  async updateProfile(id, data) {
    const { email, name, avatar_emoji } = data;
    await this.db.run(
      'UPDATE users SET email = ?, name = ?, avatar_emoji = ? WHERE id = ?',
      [email || null, name, avatar_emoji, id]
    );
  }

  async changePassword(id, newPassword) {
    const hashed = await bcrypt.hash(newPassword, 10);
    await this.db.run(
      'UPDATE users SET admin_password = ? WHERE id = ?',
      [hashed, id]
    );
  }

  async updateAccess(id, data) {
    const fields = [];
    const params = [];

    if (data.is_admin !== undefined) {
      fields.push('is_admin = ?');
      params.push(Boolean(data.is_admin));
    }
    if (data.can_use_ai !== undefined) {
      fields.push('can_use_ai = ?');
      params.push(Boolean(data.can_use_ai));
    }

    if (fields.length === 0) return this.findById(id);

    params.push(id);
    await this.db.run(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, params);
    return this.findById(id);
  }

  async countAdmins(excludeId = null) {
    const sql = excludeId
      ? 'SELECT COUNT(*) as count FROM users WHERE is_admin = ? AND id != ?'
      : 'SELECT COUNT(*) as count FROM users WHERE is_admin = ?';
    const params = excludeId ? [true, excludeId] : [true];
    const row = await this.db.getOne(sql, params);
    return row?.count || 0;
  }
}

module.exports = UserModel;
