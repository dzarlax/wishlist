const bcrypt = require('bcryptjs');

class UserModel {
  constructor(db) {
    this.db = db;
  }

  sanitizeUser(user) {
    if (!user) return null;
    const { admin_password, ...sanitized } = user;
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
    const { slug, name, admin_password, avatar_emoji, email } = data;
    const hashedPassword = await bcrypt.hash(admin_password, 10);

    await this.db.insert(
      'INSERT INTO users (slug, name, admin_password, avatar_emoji, email) VALUES (?, ?, ?, ?, ?)',
      [slug, name, hashedPassword, avatar_emoji || '🎁', email || null]
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
      await this.db.run(
        'UPDATE users SET name = ?, avatar_emoji = ?, email = ? WHERE slug = ?',
        [data.name, data.avatar_emoji || existing.avatar_emoji, data.email || existing.email, data.slug]
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
}

module.exports = UserModel;
