const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const initSqlJs = require('sql.js');
const { SqliteAdapter } = require('../server/db/adapter');
const UserModel = require('../server/models/User');
const InviteModel = require('../server/models/Invite');
const { requireAdmin, requireAiAccess } = require('../server/middleware/access');
const { config } = require('../server/config/env');
const { generateToken, extractAuth, requireOwner, requireAuth } = require('../server/middleware/auth');
const jwt = require('jsonwebtoken');

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

test('local password JWT remains seven-day app auth and forged Authentik headers grant no access', () => {
  const priorSecret = config.jwtSecret;
  const priorExpiry = config.jwtExpiresIn;
  config.jwtSecret = 'synthetic-test-jwt-secret';
  config.jwtExpiresIn = '7d';
  try {
    const user = { id: 17, slug: 'owner', is_admin: true, can_use_ai: true };
    const token = generateToken(user);
    const claims = jwt.verify(token, config.jwtSecret);
    assert.deepEqual({ id: claims.id, slug: claims.slug }, { id: 17, slug: 'owner' });
    assert.ok(claims.exp - claims.iat >= 7 * 24 * 60 * 60 - 1);

    const forgedHeaderReq = {
      headers: { 'X-Authentik-Email': 'owner@example.test' },
      get(name) { return this.headers[name]; }
    };
    extractAuth(forgedHeaderReq, {}, () => {});
    assert.equal(forgedHeaderReq.authUser, null);

    const authResponse = () => ({
      statusCode: 200,
      status(code) { this.statusCode = code; return this; },
      json() {}
    });
    const unauthenticated = { authUser: null };
    const unauthResponse = authResponse();
    requireAuth(unauthenticated, unauthResponse, () => {});
    assert.equal(unauthResponse.statusCode, 401);

    const ownerResponse = authResponse();
    let ownerNext = false;
    requireOwner({ authUser: claims, wishlistUser: { id: 17 } }, ownerResponse, () => { ownerNext = true; });
    assert.equal(ownerNext, true);

    const otherOwnerResponse = authResponse();
    requireOwner({ authUser: claims, wishlistUser: { id: 18 } }, otherOwnerResponse, () => {});
    assert.equal(otherOwnerResponse.statusCode, 403);
  } finally {
    config.jwtSecret = priorSecret;
    config.jwtExpiresIn = priorExpiry;
  }
});

test('OIDC email lookup rejects duplicate rows and keeps database exact-case semantics', async () => {
  const singleUser = { id: 17, email: 'owner@example.test' };
  const model = new UserModel({
    async getAll(_query, values) {
      assert.deepEqual(values, ['owner@example.test']);
      return [singleUser];
    }
  });
  assert.equal(await model.findUniqueByEmail('owner@example.test'), singleUser);

  const duplicates = new UserModel({
    async getAll() { return [singleUser, { id: 18, email: 'owner@example.test' }]; }
  });
  assert.equal(await duplicates.findUniqueByEmail('owner@example.test'), null);
});

test('OIDC discovery failure exits before touching SQLite or starting timers', async t => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wishlist-auth-'));
  const databasePath = path.join(tempDir, 'synthetic.sqlite');
  const child = spawn(process.execPath, ['-e', 'global.fetch = async () => { throw new Error("network disabled in test"); }; require("./server.js");'], {
    cwd: path.join(__dirname, '..'),
    env: {
      ...process.env,
      NODE_ENV: 'test',
      DATABASE_URL: '',
      WISHLIST_DB_PATH: databasePath,
      OIDC_ENABLED: 'true',
      OIDC_ISSUER: 'https://issuer.example.test',
      OIDC_CLIENT_ID: 'synthetic-client',
      OIDC_CLIENT_SECRET: 'synthetic-secret',
      APP_URL: 'https://wishlist.example.test',
      AUTHENTIK_ENABLED: 'false',
      AUTHENTIK_URL: '',
      AUTHENTIK_CLIENT_ID: '',
      AUTHENTIK_CLIENT_SECRET: ''
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  let output = '';
  child.stdout.on('data', chunk => { output += chunk; });
  child.stderr.on('data', chunk => { output += chunk; });

  t.after(async () => {
    if (child.exitCode === null) {
      child.kill('SIGTERM');
      await new Promise(resolve => child.once('exit', resolve));
    }
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  const exit = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`OIDC startup did not exit: ${output}`)), 10000);
    child.once('exit', (code, signal) => {
      clearTimeout(timeout);
      resolve({ code, signal });
    });
  });
  assert.equal(exit.code, 1);
  assert.match(output, /OIDC initialization failed/);
  assert.doesNotMatch(output, /Wishlist app running/);
  assert.equal(fs.existsSync(databasePath), false);
});

test('local password login and owner APIs work over HTTP with OIDC disabled', async t => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wishlist-auth-'));
  const databasePath = path.join(tempDir, 'synthetic.sqlite');
  const child = spawn(process.execPath, ['-e', 'global.fetch = async () => { throw new Error("network disabled in test"); }; require("./server.js");'], {
    cwd: path.join(__dirname, '..'),
    env: {
      ...process.env,
      NODE_ENV: 'test',
      DATABASE_URL: '',
      WISHLIST_TEST_HOST: '127.0.0.1',
      PORT: '0',
      JWT_SECRET: 'synthetic-local-test-secret',
      JWT_EXPIRES_IN: '7d',
      WISHLIST_DB_PATH: databasePath,
      USERS: 'owner:Owner:synthetic-password:🎁:owner@example.test,other:Other:other-password:🎁:other@example.test',
      OIDC_ENABLED: 'false', OIDC_ISSUER: '', OIDC_CLIENT_ID: '', OIDC_CLIENT_SECRET: '',
      AUTHENTIK_ENABLED: 'false', AUTHENTIK_URL: '', AUTHENTIK_CLIENT_ID: '', AUTHENTIK_CLIENT_SECRET: '',
      APP_URL: 'http://localhost:3000'
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  let output = '';
  child.stdout.on('data', chunk => { output += chunk; });
  child.stderr.on('data', chunk => { output += chunk; });

  async function waitForServer() {
    const timeout = Date.now() + 10000;
    while (Date.now() < timeout) {
      const match = output.match(/Wishlist app running on http:\/\/localhost:(\d+)/);
      if (match) return `http://127.0.0.1:${match[1]}`;
      if (child.exitCode !== null) throw new Error(`Synthetic Wishlist server exited early: ${output}`);
      await new Promise(resolve => setTimeout(resolve, 25));
    }
    throw new Error(`Synthetic Wishlist server did not start: ${output}`);
  }

  t.after(async () => {
    if (child.exitCode === null) {
      child.kill('SIGTERM');
      await new Promise(resolve => child.once('exit', resolve));
    }
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  const baseUrl = await waitForServer();
  const ssoConfig = await fetch(`${baseUrl}/api/auth/config`);
  assert.deepEqual(await ssoConfig.json(), { sso: false, ssoUrl: null, ssoProvider: null });
  const ssoRedirect = await fetch(`${baseUrl}/api/auth/sso/redirect`, { redirect: 'manual' });
  assert.equal(ssoRedirect.status, 404);

  const badLogin = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slug: 'owner', password: 'wrong-password' })
  });
  assert.equal(badLogin.status, 401);

  const login = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slug: 'owner', password: 'synthetic-password' })
  });
  assert.equal(login.status, 200);
  const { token, user } = await login.json();
  assert.equal(user.slug, 'owner');
  const claims = jwt.verify(token, 'synthetic-local-test-secret');
  assert.equal(claims.exp - claims.iat, 7 * 24 * 60 * 60);

  const me = await fetch(`${baseUrl}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
  assert.equal(me.status, 200);
  assert.equal((await me.json()).slug, 'owner');

  const forbidden = await fetch(`${baseUrl}/api/users/other/gifts`, {
    method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Synthetic gift' })
  });
  assert.equal(forbidden.status, 403);
  const ownedGifts = await fetch(`${baseUrl}/api/users/owner/gifts`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  assert.equal(ownedGifts.status, 200);
  assert.deepEqual(await ownedGifts.json(), []);
  assert.doesNotMatch(output, /OIDC initialization|\.well-known\/openid-configuration/);
  assert.equal(fs.existsSync(databasePath), true);
});
