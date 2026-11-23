const assert = require('node:assert/strict');
const test = require('node:test');
const express = require('express');
const jwt = require('jsonwebtoken');
const { once } = require('node:events');
const { createMetadataService, requireMetadataUser, metadataErrorHandler } = require('../server/routes/metadata');
const { MetadataError, validateUrl } = require('../server/utils/publicFetch');
const { jsonBody, jsonBodyErrorHandler } = require('../server/middleware/jsonBody');
const { requireAuth } = require('../server/middleware/auth');
const { requireAiAccess } = require('../server/middleware/access');
const { extractMetadata } = require('../server/utils/metadata');

test('legitimate public HTML retains metadata response fields and relative-image behavior', async () => {
  const result = await extractMetadata('https://example.com/product', {
    fetchHtml: async url => {
      assert.equal(url, 'https://example.com/product');
      return { html: '<title>Fallback</title><meta property="og:title" content="Gift"><meta property="og:description" content="Useful"><meta property="og:image" content="/gift.jpg"><meta property="og:url" content="https://example.com/canonical">', finalUrl: 'https://example.com/redirected' };
    }
  });
  assert.deepEqual(result, {
    title: 'Gift', description: 'Useful', image: 'https://example.com/gift.jpg', url: 'https://example.com/canonical'
  });
});

test('both metadata callers enforce identity, access, policy and a shared user budget', async t => {
  let loads = 0;
  let aiCalls = 0;
  let time = 100;
  const service = createMetadataService({
    now: () => time,
    extract: async url => {
      validateUrl(url);
      loads++;
      if (url.includes('/offline')) throw new MetadataError('METADATA_UPSTREAM_ERROR', 502);
      return { title: 'Product', description: 'A gift', image: null, url };
    }
  });
  const key = 'synthetic-metadata-fixture';
  const app = express();
  app.use(jsonBody());
  app.use((req, res, next) => {
    try { req.authUser = jwt.verify((req.get('Authorization') || '').slice(7), key); } catch { req.authUser = null; }
    req.currentUser = req.authUser && req.authUser.id !== 9 ? { id: req.authUser.id, can_use_ai: req.authUser.id !== 2 } : null;
    next();
  });
  app.post('/api/extract-metadata', requireMetadataUser, service.extractHandler);
  app.post('/api/parse-gift', requireAuth, requireAiAccess, async (req, res, next) => {
    try {
      const result = await service.forGift(req.body.text, req.currentUser.id);
      aiCalls++;
      res.json(result);
    } catch (error) { next(error); }
  });
  app.use(jsonBodyErrorHandler);
  app.use(metadataErrorHandler);
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => { server.closeAllConnections(); return new Promise(resolve => server.close(resolve)); });
  const base = `http://127.0.0.1:${server.address().port}`;
  const tokens = [1, 2, 9].map(id => jwt.sign({ id }, key, { expiresIn: 60 }));
  async function post(path, body, token) {
    return fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, body: JSON.stringify(body) });
  }
  for (const token of [undefined, 'invalid', jwt.sign({ id: 1 }, key, { expiresIn: -1 }), tokens[2]]) {
    assert.equal((await post('/api/extract-metadata', { url: 'https://example.com' }, token)).status, 401);
  }
  assert.equal(loads, 0);
  assert.equal((await post('/api/parse-gift', { text: 'https://example.com' }, tokens[1])).status, 403);
  assert.equal((await post('/api/extract-metadata', { url: 'https://example.com' }, tokens[1])).status, 200);
  for (const path of ['/api/extract-metadata', '/api/parse-gift']) {
    const response = await post(path, { url: 'http://127.0.0.1', text: 'http://127.0.0.1' }, tokens[0]);
    assert.equal(response.status, 400);
    assert.equal((await response.json()).code, 'METADATA_URL_BLOCKED');
  }
  assert.equal(aiCalls, 0);
  const offline = await post('/api/parse-gift', { text: 'https://example.com/offline' }, tokens[0]);
  assert.equal(offline.status, 200);
  assert.deepEqual((await offline.json()).metadata, {});
  assert.equal((await post('/api/parse-gift', { text: 'A normal gift in plain text' }, tokens[0])).status, 200);
  assert.equal(aiCalls, 2);
  // Three URL attempts above consume the same ten-per-minute budget as direct requests.
  for (let i = 0; i < 7; i++) assert.equal((await post('/api/extract-metadata', { url: 'https://example.com' }, tokens[0])).status, 200);
  const limited = await post('/api/parse-gift', { text: 'https://example.com' }, tokens[0]);
  assert.equal(limited.status, 429);
  assert.equal(aiCalls, 2);
  time += 60000;
  assert.equal((await post('/api/parse-gift', { text: 'https://example.com' }, tokens[0])).status, 200);
});

test('shared concurrency is bounded and released on failure and completion', async () => {
  const releases = [];
  const service = createMetadataService({ extract: () => new Promise((resolve, reject) => releases.push({ resolve, reject })) });
  const pending = [1, 2, 3, 4].map(id => service.forGift('https://example.com', id));
  await assert.rejects(service.forGift('https://example.com', 5), { status: 429 });
  releases[0].reject(new MetadataError('METADATA_TIMEOUT', 504));
  await pending[0];
  const replacement = service.forGift('https://example.com', 5);
  for (const release of releases.slice(1)) release.resolve({ title: 'ok' });
  await Promise.all([...pending.slice(1), replacement]);
  assert.equal((await service.forGift('just text', 1)).isUrl, false);
});
