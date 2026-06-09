const crypto = require('crypto');

const INVITE_TTL_DAYS = 7;

class InviteModel {
  constructor(db) {
    this.db = db;
  }

  generateToken() {
    return crypto.randomBytes(32).toString('base64url');
  }

  hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  getExpiryDate(now = new Date()) {
    const expires = new Date(now);
    expires.setDate(expires.getDate() + INVITE_TTL_DAYS);
    return expires;
  }

  serializeDate(date) {
    return date instanceof Date ? date.toISOString() : date;
  }

  normalizeInvite(invite) {
    if (!invite) return null;
    return {
      ...invite,
      can_use_ai: Boolean(invite.can_use_ai),
      status: this.getStatus(invite)
    };
  }

  sanitizeInvite(invite) {
    const normalized = this.normalizeInvite(invite);
    if (!normalized) return null;
    const safe = { ...normalized };
    delete safe.token_hash;
    return safe;
  }

  sanitizePublicInvite(invite) {
    const normalized = this.normalizeInvite(invite);
    if (!normalized) return null;
    return {
      email: normalized.email,
      name_hint: normalized.name_hint,
      can_use_ai: normalized.can_use_ai,
      expires_at: normalized.expires_at
    };
  }

  getStatus(invite, now = new Date()) {
    if (invite.revoked_at) return 'revoked';
    if (invite.used_at) return 'used';
    if (new Date(invite.expires_at).getTime() <= now.getTime()) return 'expired';
    return 'active';
  }

  isAcceptable(invite) {
    return this.getStatus(invite) === 'active';
  }

  async create(data) {
    const token = this.generateToken();
    const tokenHash = this.hashToken(token);
    const expiresAt = this.serializeDate(data.expires_at || this.getExpiryDate());

    const id = await this.db.insert(
      `INSERT INTO invites (token_hash, created_by_user_id, email, name_hint, can_use_ai, expires_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        tokenHash,
        data.created_by_user_id,
        data.email || null,
        data.name_hint || null,
        Boolean(data.can_use_ai),
        expiresAt
      ]
    );

    const invite = await this.findById(id);
    return { token, invite: this.sanitizeInvite(invite) };
  }

  async findById(id) {
    return this.db.getOne('SELECT * FROM invites WHERE id = ?', [id]);
  }

  async findByToken(token) {
    return this.db.getOne('SELECT * FROM invites WHERE token_hash = ?', [this.hashToken(token)]);
  }

  async findAll() {
    const rows = await this.db.getAll(`
      SELECT i.*, creator.slug AS created_by_slug, creator.name AS created_by_name,
             used_by.slug AS used_by_slug, used_by.name AS used_by_name
      FROM invites i
      LEFT JOIN users creator ON creator.id = i.created_by_user_id
      LEFT JOIN users used_by ON used_by.id = i.used_by_user_id
      ORDER BY i.created_at DESC
    `);
    return rows.map(row => this.sanitizeInvite(row));
  }

  async markUsed(id, userId, usedAt = new Date()) {
    const result = await this.db.run(
      'UPDATE invites SET used_at = ?, used_by_user_id = ? WHERE id = ? AND used_at IS NULL AND revoked_at IS NULL',
      [this.serializeDate(usedAt), userId, id]
    );
    return {
      changes: result.changes,
      invite: await this.findById(id)
    };
  }

  async revoke(id, revokedAt = new Date()) {
    await this.db.run(
      'UPDATE invites SET revoked_at = ? WHERE id = ? AND used_at IS NULL AND revoked_at IS NULL',
      [this.serializeDate(revokedAt), id]
    );
    return this.findById(id);
  }
}

InviteModel.INVITE_TTL_DAYS = INVITE_TTL_DAYS;

module.exports = InviteModel;
