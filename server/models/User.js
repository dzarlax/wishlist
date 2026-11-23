const bcrypt = require('bcryptjs');
const { randomBytes, createHash } = require('node:crypto');

const RESET_TTL_MS = 30 * 60 * 1000;

function hashResetToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

class UserModel {
  constructor(db) {
    this.db = db;
  }

  sanitizeUser(user) {
    if (!user) return null;
    const sanitized = { ...user };
    delete sanitized.admin_password;
    delete sanitized.password_reset_hash;
    delete sanitized.password_reset_expires_at;
    delete sanitized.admin_email_override;
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

  async findUniqueByEmail(email) {
    const users = await this.db.getAll('SELECT * FROM users WHERE email = ?', [email]);
    return users.length === 1 ? users[0] : null;
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
   * Hashes the initial password and preserves the current password on later runs.
   */
  async seed(data) {
    const existing = await this.findBySlug(data.slug);
    if (existing) {
      // An explicit admin email change takes precedence over the bootstrap email.
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
        `UPDATE users SET name = ?, avatar_emoji = ?,
           password_reset_hash = CASE WHEN NOT admin_email_override AND email IS DISTINCT FROM COALESCE(?, email)
             THEN NULL ELSE password_reset_hash END,
           password_reset_expires_at = CASE WHEN NOT admin_email_override AND email IS DISTINCT FROM COALESCE(?, email)
             THEN NULL ELSE password_reset_expires_at END,
           email = CASE WHEN admin_email_override THEN email ELSE COALESCE(?, email) END
           ${accessFields.length ? `, ${accessFields.join(', ')}` : ''} WHERE slug = ?`,
        [
          data.name,
          data.avatar_emoji || existing.avatar_emoji,
          data.email || null,
          data.email || null,
          data.email || null,
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
      `UPDATE users SET
         password_reset_hash = CASE WHEN email IS DISTINCT FROM ? THEN NULL ELSE password_reset_hash END,
         password_reset_expires_at = CASE WHEN email IS DISTINCT FROM ? THEN NULL ELSE password_reset_expires_at END,
         email = ?, name = ?, avatar_emoji = ? WHERE id = ?`,
      [email || null, email || null, email || null, name, avatar_emoji, id]
    );
  }

  async changePassword(id, newPassword) {
    const hashed = await bcrypt.hash(newPassword, 10);
    await this.db.run(
      `UPDATE users SET admin_password = ?, password_reset_hash = NULL,
         password_reset_expires_at = NULL WHERE id = ?`,
      [hashed, id]
    );
  }

  async updateAdminEmail(id, email) {
    const { changes } = await this.db.run(
      `UPDATE users SET
         password_reset_hash = CASE WHEN email IS DISTINCT FROM ? THEN NULL ELSE password_reset_hash END,
         password_reset_expires_at = CASE WHEN email IS DISTINCT FROM ? THEN NULL ELSE password_reset_expires_at END,
         email = ?, admin_email_override = TRUE
       WHERE id = ?`,
      [email, email, email, id]
    );
    return changes === 1 ? this.findById(id) : null;
  }

  async createPasswordReset(id) {
    const token = randomBytes(32).toString('base64url');
    const expiresAt = Date.now() + RESET_TTL_MS;
    const { changes } = await this.db.run(
      'UPDATE users SET password_reset_hash = ?, password_reset_expires_at = ? WHERE id = ?',
      [hashResetToken(token), expiresAt, id]
    );
    return changes === 1 ? { token, expiresAt: new Date(expiresAt).toISOString() } : null;
  }

  async resetPassword(token, password) {
    const tokenHash = hashResetToken(token);
    const user = await this.db.getOne(
      'SELECT id FROM users WHERE password_reset_hash = ? AND password_reset_expires_at > ?',
      [tokenHash, Date.now()]
    );
    if (!user) return false;

    const hashed = await bcrypt.hash(password, 10);
    const { changes } = await this.db.run(
      `UPDATE users SET admin_password = ?, password_reset_hash = NULL, password_reset_expires_at = NULL
       WHERE id = ? AND password_reset_hash = ? AND password_reset_expires_at > ?`,
      [hashed, user.id, tokenHash, Date.now()]
    );
    return changes === 1;
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
