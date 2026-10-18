const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const test = require('node:test');
const { createOidcAuth, FLOW_COOKIE } = require('../server/auth/oidc');
const { validateAuthConfig } = require('../server/config/env');
const { safeRequestUrl } = require('../server/utils/request-logging');

const issuer = 'https://oidc.example.test';
const clientId = 'wishlist-synthetic-client';
const clientSecret = 'synthetic-client-secret';
const appUrl = 'https://wishlist.example.test';
const redirectUri = `${appUrl}/api/auth/sso/callback`;

function response(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

function makeResponse() {
  return {
    headers: {},
    statusCode: 302,
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
    redirect(location) { this.location = location; return this; }
  };
}

function base64url(value) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function signJwt(claims, keyPair, kid) {
  const payload = `${base64url({ alg: 'RS256', kid })}.${base64url(claims)}`;
  return `${payload}.${crypto.sign('RSA-SHA256', Buffer.from(payload), keyPair.privateKey).toString('base64url')}`;
}

function createProvider(mode = {}) {
  const providerIssuer = mode.issuer || issuer;
  const keyPair = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const alternateKeyPair = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const jwk = keyPair.publicKey.export({ format: 'jwk' });
  Object.assign(jwk, { use: 'sig', alg: 'RS256', kid: 'synthetic-key' });
  const codes = new Map();
  const metadata = {
    issuer: providerIssuer,
    authorization_endpoint: `${providerIssuer}/authorize`,
    token_endpoint: `${providerIssuer}/token`,
    userinfo_endpoint: `${providerIssuer}/userinfo`,
    jwks_uri: `${providerIssuer}/jwks`,
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code'],
    token_endpoint_auth_methods_supported: ['client_secret_post']
  };

  async function fetch(input, init = {}) {
    const url = new URL(input instanceof Request ? input.url : input);
    if (url.pathname.endsWith('/.well-known/openid-configuration')) return response(metadata);
    if (url.pathname.endsWith('/jwks')) return response({ keys: [jwk] });
    if (url.pathname.endsWith('/token')) {
      const body = new URLSearchParams(init.body instanceof URLSearchParams ? init.body : String(init.body || ''));
      const pending = codes.get(body.get('code'));
      codes.delete(body.get('code'));
      if (!pending || body.get('client_id') !== clientId || body.get('client_secret') !== clientSecret || body.get('redirect_uri') !== redirectUri) {
        return response({ error: 'invalid_grant' }, 400);
      }
      const verifier = body.get('code_verifier') || '';
      const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
      if (pending.challengeMethod !== 'S256' || pending.challenge !== challenge || mode.pkceFailure) {
        return response({ error: 'invalid_grant' }, 400);
      }
      const claims = {
        iss: mode.badIssuer ? `${providerIssuer}/wrong` : providerIssuer,
        aud: mode.badAudience ? 'another-client' : clientId,
        sub: mode.idTokenSub || 'synthetic-subject-1',
        email: mode.idTokenEmail || 'owner@example.test',
        email_verified: true,
        nonce: mode.badNonce ? 'wrong-nonce' : pending.nonce,
        iat: Math.floor(Date.now() / 1000) - 10,
        exp: mode.expired ? Math.floor(Date.now() / 1000) - 1 : Math.floor(Date.now() / 1000) + 300
      };
      const signingKey = mode.badSignature ? alternateKeyPair : keyPair;
      const idToken = signJwt(claims, signingKey, 'synthetic-key');
      return response({ access_token: 'synthetic-access-token', token_type: 'Bearer', expires_in: 300, id_token: idToken });
    }
    if (url.pathname.endsWith('/userinfo')) {
      if (new Headers(init.headers).get('authorization') !== 'Bearer synthetic-access-token') return response({ error: 'unauthorized' }, 401);
      return response({
        sub: mode.userInfoSub || 'synthetic-subject-1',
        email: mode.email || 'owner@example.test',
        email_verified: mode.emailVerified === undefined ? true : mode.emailVerified
      });
    }
    throw new Error(`Unexpected fake provider request: ${url.pathname}`);
  }

  return {
    async handleAuthorizationRequest(authUrl) {
      const state = authUrl.searchParams.get('state');
      const code = crypto.randomBytes(18).toString('base64url');
      codes.set(code, {
        state,
        nonce: authUrl.searchParams.get('nonce'),
        challenge: authUrl.searchParams.get('code_challenge'),
        challengeMethod: authUrl.searchParams.get('code_challenge_method')
      });
      const callback = new URL(authUrl.searchParams.get('redirect_uri'));
      callback.searchParams.set('code', code);
      callback.searchParams.set('state', state);
      return callback;
    },
    fetch
  };
}

async function withAuth(mode, callback) {
  const provider = createProvider(mode);
  const settings = { oidcIssuer: mode.issuer || issuer, oidcClientId: clientId, oidcClientSecret: clientSecret, appUrl };
  const users = [{ id: 17, slug: 'owner', email: 'owner@example.test', is_admin: true, can_use_ai: true }];
  if (mode.duplicateExisting) users.push({ id: 18, slug: 'other-owner', email: 'owner@example.test', is_admin: false, can_use_ai: false });
  const userModel = {
    async findUniqueByEmail(email) {
      const matches = users.filter(user => user.email === email);
      return matches.length === 1 ? matches[0] : null;
    }
  };
  const warnings = [];
  const originalFetch = global.fetch;
  global.fetch = provider.fetch;
  try {
    const oidc = createOidcAuth({
      settings,
      userModel,
      generateToken: user => `app-jwt-for-${user.id}`,
      logger: { warn: code => warnings.push(code) },
      clientLoader: async () => {
        const client = await import('openid-client');
        return {
          ...client,
          discovery: async (...args) => {
            const config = await client.discovery(...args);
            config[client.customFetch] = provider.fetch;
            return config;
          }
        };
      }
    });
    await oidc.initialize();
    global.fetch = originalFetch;
    return await callback({ oidc, provider, warnings, users, settings });
  } finally {
    global.fetch = originalFetch;
  }
}

async function beginFlow(oidc, provider) {
  const start = makeResponse();
  await oidc.redirect({}, start);
  assert.match(start.location, /^https:\/\//);
  assert.match(start.headers['Set-Cookie'], /HttpOnly; Secure; SameSite=Lax/);
  assert.match(start.headers['Set-Cookie'], /Path=\/api\/auth\/sso/);
  const authUrl = new URL(start.location);
  assert.equal(authUrl.searchParams.get('response_type'), 'code');
  assert.equal(authUrl.searchParams.get('code_challenge_method'), 'S256');
  assert.ok(authUrl.searchParams.get('code_challenge'));
  return { start, callbackUrl: await provider.handleAuthorizationRequest(authUrl) };
}

function callbackRequest(callbackUrl, cookie) {
  return {
    headers: { cookie },
    originalUrl: `${callbackUrl.pathname}${callbackUrl.search}`,
    query: Object.fromEntries(callbackUrl.searchParams.entries())
  };
}

function flowCookie(response) {
  return response.headers['Set-Cookie'].split(';', 1)[0];
}

test('OIDC config rejects simultaneous, partial, and unsafe settings', () => {
  const valid = {
    oidcEnabled: true, oidcIssuer: issuer, oidcClientId: clientId, oidcClientSecret: clientSecret,
    authentikEnabled: false, authentikUrl: null, authentikClientId: null, authentikClientSecret: null, appUrl
  };
  assert.equal(validateAuthConfig(valid), true);
  assert.throws(() => validateAuthConfig({ ...valid, oidcClientSecret: null }), /incomplete/);
  assert.throws(() => validateAuthConfig({ ...valid, authentikEnabled: true, authentikUrl: 'https://auth.example.test', authentikClientId: 'legacy', authentikClientSecret: 'secret' }), /cannot both/);
  assert.throws(() => validateAuthConfig({ ...valid, oidcIssuer: 'http://issuer.example.test' }), /HTTPS/);
  assert.throws(() => validateAuthConfig({ ...valid, appUrl: 'http://wishlist.example.test' }), /HTTPS origin/);
});

test('OIDC callback request logging redacts query parameters across route aliases', () => {
  for (const path of ['/api/auth/sso/callback', '/API/AUTH/SSO/CALLBACK', '/api/auth/sso/callback/']) {
    assert.equal(safeRequestUrl({ path, originalUrl: `${path}?code=synthetic-code&state=synthetic-state` }, true), path);
  }
  assert.equal(safeRequestUrl({ path: '/api/auth/other', originalUrl: '/api/auth/other?token=synthetic' }, true), '/api/auth/other?token=synthetic');
  assert.equal(safeRequestUrl({ path: '/api/auth/sso/callback', originalUrl: '/api/auth/sso/callback?code=legacy' }, false), '/api/auth/sso/callback?code=legacy');
});

test('OIDC validates signed ID token and exact existing email before compatible JWT handoff', async () => {
  await withAuth({}, async ({ oidc, provider, users }) => {
    const { start, callbackUrl } = await beginFlow(oidc, provider);
    const result = makeResponse();
    await oidc.callback(callbackRequest(callbackUrl, flowCookie(start)), result);
    assert.match(result.location, /^\/#\/sso-complete\?token=app-jwt-for-17&slug=owner$/);
    assert.equal(users.length, 1);
    assert.equal(users[0].is_admin, true);
    assert.equal(users[0].can_use_ai, true);
  });
});

for (const configuredIssuer of [issuer, `${issuer}/`, 'https://oidc.example.test/cdn-cgi/access/apps/example']) {
  test(`OIDC accepts exact discovery issuer ${configuredIssuer}`, async () => {
    await withAuth({ issuer: configuredIssuer }, async ({ oidc, provider }) => {
      const { start, callbackUrl } = await beginFlow(oidc, provider);
      const result = makeResponse();
      await oidc.callback(callbackRequest(callbackUrl, flowCookie(start)), result);
      assert.match(result.location, /sso-complete/);
    });
  });
}

for (const [label, mode] of [
  ['issuer', { badIssuer: true }],
  ['audience', { badAudience: true }],
  ['signature', { badSignature: true }],
  ['expiry', { expired: true }],
  ['nonce', { badNonce: true }],
  ['userinfo subject', { userInfoSub: 'different-subject' }],
  ['email verification', { emailVerified: false }],
  ['unknown email', { email: 'unknown@example.test' }],
  ['duplicate existing email', { duplicateExisting: true }],
  ['case-mismatched email', { email: 'Owner@example.test' }],
  ['ID token and UserInfo email equality', { idTokenEmail: 'different@example.test' }]
]) {
  test(`OIDC denies invalid ${label}`, async () => {
    await withAuth(mode, async ({ oidc, provider, warnings, users }) => {
      const originalUserCount = users.length;
      const { start, callbackUrl } = await beginFlow(oidc, provider);
      const result = makeResponse();
      await oidc.callback(callbackRequest(callbackUrl, flowCookie(start)), result);
      assert.match(result.location, /error=oidc/);
      assert.equal(users.length, originalUserCount);
      assert.ok(warnings.every(entry => entry.startsWith('OIDC callback denied: ')));
    });
  });
}

test('OIDC checks authorization state and PKCE, rejects duplicate or replayed callbacks', async () => {
  await withAuth({}, async ({ oidc, provider, warnings }) => {
    const { start, callbackUrl } = await beginFlow(oidc, provider);
    const cookie = flowCookie(start);
    const badQuery = callbackRequest(callbackUrl, cookie);
    badQuery.query.state = ['duplicated', 'state'];
    const malformed = makeResponse();
    await oidc.callback(badQuery, malformed);
    assert.match(malformed.location, /error=oidc/);
    assert.equal(oidc.pendingFlowCount(), 1);

    const mismatch = makeResponse();
    await oidc.callback(callbackRequest(callbackUrl, `${FLOW_COOKIE}=wrong`), mismatch);
    assert.match(mismatch.location, /error=oidc/);
    assert.equal(oidc.pendingFlowCount(), 0);

    const validFlow = await beginFlow(oidc, provider);
    const success = makeResponse();
    await oidc.callback(callbackRequest(validFlow.callbackUrl, flowCookie(validFlow.start)), success);
    assert.deepEqual(warnings, []);
    assert.match(success.location, /sso-complete/);

    const replay = makeResponse();
    await oidc.callback(callbackRequest(validFlow.callbackUrl, flowCookie(validFlow.start)), replay);
    assert.match(replay.location, /error=oidc/);
    assert.equal(oidc.pendingFlowCount(), 0);
  });

  await withAuth({ pkceFailure: true }, async ({ oidc, provider }) => {
    const { start, callbackUrl } = await beginFlow(oidc, provider);
    const result = makeResponse();
    await oidc.callback(callbackRequest(callbackUrl, flowCookie(start)), result);
    assert.match(result.location, /error=oidc/);
  });
});

test('expired OIDC flow is rejected and removed before replay', async () => {
  await withAuth({}, async ({ oidc, provider }) => {
    const { start, callbackUrl } = await beginFlow(oidc, provider);
    const result = makeResponse();
    const originalNow = Date.now;
    Date.now = () => originalNow() + 6 * 60 * 1000;
    try {
      await oidc.callback(callbackRequest(callbackUrl, flowCookie(start)), result);
    } finally {
      Date.now = originalNow;
    }
    assert.match(result.location, /error=oidc/);
    assert.equal(oidc.pendingFlowCount(), 0);
  });
});
