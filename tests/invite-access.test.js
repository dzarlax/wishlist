const assert = require('node:assert/strict');
const test = require('node:test');
const initSqlJs = require('sql.js');
const { SqliteAdapter } = require('../server/db/adapter');
const UserModel = require('../server/models/User');
const InviteModel = require('../server/models/Invite');
const { requireAdmin, requireAiAccess } = require('../server/middleware/access');

async function createDb() {
  const SQL = await initSqlJs();
  const sqlDb = new SQL.Database();
  const db = new SqliteAdapter(sqlDb, () => {});
  return { db, close: () => sqlDb.close() };
}

async function runMigration(db, version) {
  const file = {
    1: '0001-initial-schema.js',
    2: '0002-add-category-codes.js',
    3: '0003-add-priority-codes.js',
    4: '0004-cleanup-schema.js',
    5: '0005-add-users.js',
    6: '0006-add-categories-priorities-email.js',
    7: '0007-split-price.js',
    8: '0008-currency-rates.js',
    9: '0009-add-invites-access-flags.js'
  }[version];
  const migration = require(`../server/migrations/${file}`);
  await migration.up(db);
}

async function migrateThrough(db, version) {
  for (let i = 1; i <= version; i += 1) {
    await runMigration(db, i);
  }
}

function runMiddleware(middleware, currentUser = null) {
  const req = { currentUser };
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    }
  };
  let nextCalled = false;
  middleware(req, res, () => { nextCalled = true; });
  return { res, nextCalled };
}

test('migration assigns alexey as admin and keeps existing users AI-enabled', async () => {
  const { db, close } = await createDb();
  try {
    await migrateThrough(db, 8);
    await db.run(
      `INSERT INTO users (slug, name, admin_password, avatar_emoji, email)
       VALUES (?, ?, ?, ?, ?)`,
      ['alexey', 'Alexey', 'legacy-password', '🎁', 'alexey@example.com']
    );
    await db.run(
      `INSERT INTO users (slug, name, admin_password, avatar_emoji, email)
       VALUES (?, ?, ?, ?, ?)`,
      ['mariia', 'Mariia', 'legacy-password', '💅', null]
    );

    await runMigration(db, 9);

    const userModel = new UserModel(db);
    const alexey = userModel.sanitizeUser(await userModel.findBySlug('alexey'));
    const mariia = userModel.sanitizeUser(await userModel.findBySlug('mariia'));

    assert.equal(alexey.is_admin, true);
    assert.equal(alexey.can_use_ai, true);
    assert.equal(mariia.is_admin, false);
    assert.equal(mariia.can_use_ai, true);
  } finally {
    close();
  }
});

test('invite lifecycle supports active, public payload, used, and revoked states', async () => {
  const { db, close } = await createDb();
  try {
    await migrateThrough(db, 9);
    const userModel = new UserModel(db);
    const inviteModel = new InviteModel(db);

    const admin = await userModel.create({
      slug: 'admin',
      name: 'Admin',
      admin_password: 'password123',
      is_admin: true,
      can_use_ai: true
    });

    const { token, invite } = await inviteModel.create({
      created_by_user_id: admin.id,
      email: 'new@example.com',
      name_hint: 'New User',
      can_use_ai: false
    });

    assert.equal(invite.status, 'active');
    assert.equal(invite.token_hash, undefined);

    const found = await inviteModel.findByToken(token);
    const publicInvite = inviteModel.sanitizePublicInvite(found);
    assert.deepEqual(Object.keys(publicInvite).sort(), ['can_use_ai', 'email', 'expires_at', 'name_hint'].sort());
    assert.equal(publicInvite.email, 'new@example.com');
    assert.equal(publicInvite.can_use_ai, false);

    const user = await userModel.create({
      slug: 'new-user',
      name: 'New User',
      admin_password: 'password123',
      email: found.email,
      can_use_ai: found.can_use_ai
    });
    const usedResult = await inviteModel.markUsed(found.id, user.id);
    const used = inviteModel.normalizeInvite(usedResult.invite);
    assert.equal(usedResult.changes, 1);
    assert.equal(used.status, 'used');

    const { invite: secondInvite } = await inviteModel.create({
      created_by_user_id: admin.id,
      can_use_ai: true
    });
    const revoked = inviteModel.normalizeInvite(await inviteModel.revoke(secondInvite.id));
    assert.equal(revoked.status, 'revoked');
  } finally {
    close();
  }
});

test('invite consume reports losing updates so callers can roll back created users', async () => {
  const { db, close } = await createDb();
  try {
    await migrateThrough(db, 9);
    const userModel = new UserModel(db);
    const inviteModel = new InviteModel(db);

    const admin = await userModel.create({
      slug: 'admin',
      name: 'Admin',
      admin_password: 'password123',
      is_admin: true,
      can_use_ai: true
    });
    const firstUser = await userModel.create({
      slug: 'first-user',
      name: 'First User',
      admin_password: 'password123'
    });
    const secondUser = await userModel.create({
      slug: 'second-user',
      name: 'Second User',
      admin_password: 'password123'
    });
    const { invite } = await inviteModel.create({ created_by_user_id: admin.id });

    const firstConsume = await inviteModel.markUsed(invite.id, firstUser.id);
    const secondConsume = await inviteModel.markUsed(invite.id, secondUser.id);

    assert.equal(firstConsume.changes, 1);
    assert.equal(secondConsume.changes, 0);
    assert.equal(inviteModel.normalizeInvite(secondConsume.invite).used_by_user_id, firstUser.id);
  } finally {
    close();
  }
});

test('seeded users can bootstrap admin and AI access without replacing passwords', async () => {
  const { db, close } = await createDb();
  try {
    await migrateThrough(db, 9);
    const userModel = new UserModel(db);

    const created = userModel.sanitizeUser(await userModel.seed({
      slug: 'owner',
      name: 'Owner',
      admin_password: 'original-password',
      is_admin: true,
      can_use_ai: true
    }));

    assert.equal(created.is_admin, true);
    assert.equal(created.can_use_ai, true);

    const updated = await userModel.seed({
      slug: 'owner',
      name: 'Updated Owner',
      admin_password: 'different-password',
      is_admin: false,
      can_use_ai: false
    });

    assert.equal(updated.name, 'Updated Owner');
    assert.equal(userModel.sanitizeUser(updated).is_admin, true);
    assert.equal(userModel.sanitizeUser(updated).can_use_ai, true);
    assert.equal(await userModel.verifyPassword(updated, 'original-password'), true);
    assert.equal(await userModel.verifyPassword(updated, 'different-password'), false);
  } finally {
    close();
  }
});

test('access middleware blocks missing or insufficient privileges', () => {
  let result = runMiddleware(requireAdmin);
  assert.equal(result.nextCalled, false);
  assert.equal(result.res.statusCode, 401);

  result = runMiddleware(requireAdmin, { is_admin: false });
  assert.equal(result.nextCalled, false);
  assert.equal(result.res.statusCode, 403);

  result = runMiddleware(requireAdmin, { is_admin: true });
  assert.equal(result.nextCalled, true);

  result = runMiddleware(requireAiAccess, { can_use_ai: false });
  assert.equal(result.nextCalled, false);
  assert.equal(result.res.statusCode, 403);

  result = runMiddleware(requireAiAccess, { can_use_ai: true });
  assert.equal(result.nextCalled, true);
});
