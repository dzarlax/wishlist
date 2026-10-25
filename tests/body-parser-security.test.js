const assert = require('node:assert/strict');
const test = require('node:test');
const path = require('node:path');
const { fork } = require('node:child_process');
const { once } = require('node:events');
const { gzipSync, deflateSync, brotliCompressSync } = require('node:zlib');

async function fixture(t, mode) {
  const child = fork(path.join(__dirname, 'fixtures/json-parser-server.cjs'), [mode], {
    env: { NODE_ENV: 'test' }, stdio: ['ignore', 'ignore', 'pipe', 'ipc']
  });
  t.after(async () => {
    if (child.exitCode === null && child.signalCode === null) { child.kill(); await once(child, 'exit'); }
  });
  const ready = await Promise.race([
    once(child, 'message').then(([v]) => v),
    once(child, 'exit').then(() => { throw new Error('JSON fixture exited before readiness'); })
  ]);
  return { child, url: `http://127.0.0.1:${ready.port}` };
}

test('fixed default parser survives gzip with trailing invalid bytes (CVE-2026-111181)', async t => {
  const { child, url } = await fixture(t, 'default');
  assert.equal(require('body-parser/package.json').version, '1.20.9');
  const body = Buffer.concat([gzipSync('{"gift":"normal"}'), Buffer.from('invalid trailing bytes')]);
  const response = await fetch(url + '/json', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Encoding': 'gzip' }, body });
  assert.ok([200, 400].includes(response.status));
  await new Promise(resolve => setTimeout(resolve, 100));
  assert.equal(child.exitCode, null);
  assert.equal((await fetch(url + '/health')).status, 200);
});

test('production parser accepts normal JSON and returns safe 400/413/415 errors', async t => {
  const { child, url } = await fixture(t, 'protected');
  async function post(body, encoding) {
    return fetch(url + '/json', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(encoding ? { 'Content-Encoding': encoding } : {}) }, body });
  }
  assert.equal((await post('{"gift":"normal"}')).status, 200);
  assert.equal((await post('{broken')).status, 400);
  assert.equal((await post(JSON.stringify({ text: 'x'.repeat(110000) }))).status, 413);
  for (const [encoding, compress] of [['gzip', gzipSync], ['deflate', deflateSync], ['br', brotliCompressSync]]) {
    const body = Buffer.concat([compress('{"gift":"normal"}'), Buffer.from('trailing bytes')]);
    const response = await post(body, encoding);
    assert.equal(response.status, 415);
    assert.deepEqual(await response.json(), { error: 'Compressed JSON requests are not supported.', code: 'JSON_BODY_REJECTED' });
  }
  assert.equal(child.exitCode, null);
  assert.equal((await fetch(url + '/health')).status, 200);
});
