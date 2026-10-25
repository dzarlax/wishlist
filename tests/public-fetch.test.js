const assert = require('node:assert/strict');
const test = require('node:test');
const { Readable } = require('node:stream');
const http = require('node:http');
const net = require('node:net');
const { once } = require('node:events');
const { gzipSync } = require('node:zlib');
const { fetchPublicHtml, validateUrl, isPublicAddress, createPinnedAgent } = require('../server/utils/publicFetch');

const publicRecords = [{ address: '93.184.215.14', family: 4 }];
function htmlResponse(body = '<title>Product</title>', status = 200, headers = {}) {
  return {
    status, ok: status >= 200 && status < 300,
    headers: new Headers({ 'content-type': 'text/html; charset=utf-8', ...headers }),
    body: Readable.from([Buffer.from(body)])
  };
}

for (const url of [
  'http://localhost', 'http://LOCALHOST./', 'http://thing.local', 'http://db.internal', 'http://db.home.arpa',
  'http://infra-qdrant', 'http://127.0.0.1', 'http://127.1', 'http://2130706433', 'http://0x7f000001',
  'http://0177.0.0.1', 'http://10.1.2.3', 'http://172.20.0.2', 'http://192.168.0.1',
  'http://169.254.169.254', 'http://100.104.66.65', 'http://0.0.0.0', 'http://224.0.0.1',
  'http://192.0.2.1', 'http://198.18.0.1', 'http://255.255.255.255', 'http://[::1]', 'http://[::]',
  'http://[fc00::1]', 'http://[fe80::1]', 'http://[ff02::1]', 'http://[::ffff:127.0.0.1]',
  'http://[::ffff:7f00:1]', 'http://[2001:db8::1]', 'http://[64:ff9b::7f00:1]',
  'http://[64:ff9b:1::a00:1]', 'http://[2002:7f00:1::]', 'http://[2001::1]', 'http://[3fff::1]',
  'https://qdrant.dzarlax.dev', 'https://qdrant.dzarlax.dev.', 'https://dzarlax.dev',
  'https://api.jerky.in.rs', 'http://65.109.0.90', 'https://[2a01:4f9:c011:bd77::1]',
  'http://user:password@example.com', 'http://example.com:8080', 'https://example.com:80',
  'file:///etc/passwd', 'ftp://example.com', 'data:text/html,hello'
]) {
  test('reject destination without DNS or transport: ' + url, async () => {
    let calls = 0;
    await assert.rejects(fetchPublicHtml(url, {
      resolver: async () => { calls++; return publicRecords; },
      transport: async () => { calls++; return htmlResponse(); }
    }), { code: 'METADATA_URL_BLOCKED', status: 400 });
    assert.equal(calls, 0);
  });
}

test('reject malformed, non-string and overlong input without lookup', async () => {
  for (const value of [null, {}, 7, '', 'bad url', 'https://example.com/' + 'x'.repeat(4096)]) {
    assert.throws(() => validateUrl(value), { code: 'METADATA_INVALID_URL' });
  }
});

test('public address classification is conservative across IPv4 and IPv6', () => {
  for (const ip of ['8.8.8.8', '93.184.215.14', '2606:4700:4700::1111']) assert.equal(isPublicAddress(ip), true, ip);
  for (const ip of ['198.51.100.1', '203.0.113.1', '240.0.0.1', '192.0.0.1', 'not-an-ip', '::ffff:10.0.0.1']) {
    assert.equal(isPublicAddress(ip), false, ip);
  }
});

test('mixed public/private DNS answers fail closed before connection', async () => {
  let connections = 0;
  await assert.rejects(fetchPublicHtml('https://example.com', {
    resolver: async () => [...publicRecords, { address: '10.0.0.2', family: 4 }],
    transport: async () => { connections++; }
  }), { code: 'METADATA_URL_BLOCKED' });
  assert.equal(connections, 0);
});

function agentLookup(agent, hostname, options) {
  return new Promise((resolve, reject) => agent.options.lookup(hostname, options, (err, ...values) => {
    if (err) reject(err); else resolve(values);
  }));
}

test('DNS is pinned for connection lookup, family fallback and all:true', async () => {
  let resolutions = 0;
  const result = await fetchPublicHtml('https://example.com/product', {
    resolver: async () => { resolutions++; return resolutions === 1 ? publicRecords : [{ address: '127.0.0.1', family: 4 }]; },
    transport: async (url, options) => {
      assert.equal(url.hostname, 'example.com');
      assert.equal(url.protocol, 'https:');
      assert.equal(options.agent.protocol, 'https:');
      assert.equal(options.agent.options.rejectUnauthorized, undefined);
      assert.equal(options.redirect, 'manual');
      assert.deepEqual(await agentLookup(options.agent, 'example.com', { all: true }), [publicRecords]);
      assert.deepEqual(await agentLookup(options.agent, 'example.com', { family: 4 }), ['93.184.215.14', 4]);
      assert.deepEqual(await agentLookup(options.agent, 'example.com', 4), ['93.184.215.14', 4]);
      await assert.rejects(agentLookup(options.agent, 'example.com', { family: 6 }));
      await assert.rejects(agentLookup(options.agent, 'another.example.com', {}));
      assert.equal(options.headers.Authorization, undefined);
      assert.equal(options.headers.Cookie, undefined);
      return htmlResponse();
    }
  });
  assert.equal(resolutions, 1);
  assert.equal(result.html, '<title>Product</title>');
  assert.equal(result.finalUrl, 'https://example.com/product');
});

test('literal public IPv4 and IPv6 bypass resolver but not address policy', async () => {
  for (const url of ['https://8.8.8.8', 'https://[2606:4700:4700::1111]']) {
    const result = await fetchPublicHtml(url, {
      resolver: async () => { throw new Error('unexpected DNS'); }, transport: async () => htmlResponse()
    });
    assert.equal(result.html, '<title>Product</title>');
  }
});

test('IPv6 pinned lookup honors no-options and all:true callback shapes', async () => {
  const addresses = [{ address: '2606:4700:4700::1111', family: 6 }];
  const agent = createPinnedAgent(new URL('https://example.com'), 'example.com', addresses);
  try {
    assert.deepEqual(await new Promise((resolve, reject) => agent.options.lookup('example.com', (err, ...v) => err ? reject(err) : resolve(v))), [addresses[0].address, 6]);
    assert.deepEqual(await agentLookup(agent, 'example.com', { all: true }), [addresses]);
  } finally { agent.destroy(); }
});

test('each redirect is checked and previous body is closed', async () => {
  let requests = 0;
  const first = htmlResponse('', 302, { location: 'http://127.0.0.1/admin' });
  await assert.rejects(fetchPublicHtml('https://example.com', {
    resolver: async () => publicRecords,
    transport: async () => { requests++; return first; }
  }), { code: 'METADATA_URL_BLOCKED' });
  assert.equal(requests, 1);
  assert.equal(first.body.destroyed, true);
});

test('redirect hostname resolving privately is blocked before next transport', async () => {
  let requests = 0;
  await assert.rejects(fetchPublicHtml('https://example.com', {
    resolver: async hostname => hostname === 'example.com' ? publicRecords : [{ address: '192.168.1.1', family: 4 }],
    transport: async () => { requests++; return htmlResponse('', 302, { location: 'https://redirect.example.com/private' }); }
  }), { code: 'METADATA_URL_BLOCKED' });
  assert.equal(requests, 1);
});

test('public relative and absolute redirects preserve legitimate HTML extraction', async () => {
  const urls = [];
  const result = await fetchPublicHtml('https://example.com/a', {
    resolver: async () => publicRecords,
    transport: async url => {
      urls.push(url.href);
      return urls.length === 1 ? htmlResponse('', 302, { location: '/b' }) : htmlResponse('normal product');
    }
  });
  assert.deepEqual(urls, ['https://example.com/a', 'https://example.com/b']);
  assert.deepEqual(result, { html: 'normal product', finalUrl: 'https://example.com/b' });
});

test('redirect cycles, own origin, missing Location and downgrade are bounded', async () => {
  for (const location of ['https://example.com/again', 'https://health.dzarlax.dev', 'http://example.com/plain', 'http://65.109.0.90', null]) {
    let count = 0;
    await assert.rejects(fetchPublicHtml('https://example.com', {
      resolver: async () => publicRecords,
      transport: async () => { count++; return htmlResponse('', 302, location ? { location } : {}); }
    }), { code: 'METADATA_URL_BLOCKED' });
    assert.ok(count <= 4);
  }
});

test('deadline includes stalled DNS, transport and decoded body', async () => {
  for (const stage of ['dns', 'transport', 'body']) {
    let response;
    await assert.rejects(fetchPublicHtml('https://example.com', {
      timeoutMs: 25,
      resolver: async () => stage === 'dns' ? new Promise(() => {}) : publicRecords,
      transport: async () => {
        if (stage === 'transport') return new Promise(() => {});
        response = htmlResponse();
        response.body = new Readable({ read() {} });
        return response;
      }
    }), { code: 'METADATA_TIMEOUT', status: 504 });
    if (response) assert.equal(response.body.destroyed, true);
  }
});

test('unbounded chunked bodies and non-HTML responses are rejected safely', async () => {
  for (const response of [
    htmlResponse('x'.repeat(30)),
    htmlResponse('not html', 200, { 'content-type': 'application/json' }),
    htmlResponse('private details', 500)
  ]) {
    await assert.rejects(fetchPublicHtml('https://example.com', {
      resolver: async () => publicRecords, transport: async () => response, maxBytes: 20
    }), error => {
      assert.equal(error.status, 502);
      assert.doesNotMatch(error.message, /private|93\.184|example/);
      return true;
    });
    assert.equal(response.body.destroyed, true);
  }
});

test('DNS failures and late DNS completion never connect or expose details', async () => {
  let requests = 0;
  await assert.rejects(fetchPublicHtml('https://example.com', {
    resolver: async () => { throw new Error('private-host: secret query'); },
    transport: async () => { requests++; }
  }), error => error.code === 'METADATA_UPSTREAM_ERROR' && !error.message.includes('secret'));
  let finishDns;
  const result = fetchPublicHtml('https://example.com', {
    timeoutMs: 10, resolver: () => new Promise(resolve => { finishDns = resolve; }),
    transport: async () => { requests++; }
  });
  await assert.rejects(result, { code: 'METADATA_TIMEOUT' });
  finishDns(publicRecords);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(requests, 0);
});

test('real node-fetch preserves Host and bounds compressed/chunked HTML with fixture transport', async t => {
  let connections = 0;
  const server = http.createServer((req, res) => {
    assert.equal(req.headers.host, 'product.example.test');
    res.setHeader('Content-Type', 'text/html');
    if (req.url === '/gzip') {
      res.setHeader('Content-Encoding', 'gzip');
      res.end(gzipSync('<title>' + 'x'.repeat(4096) + '</title>'));
    } else if (req.url === '/chunked') {
      res.write('x'.repeat(100)); res.end('x'.repeat(100));
    } else if (req.url === '/redirect') {
      res.writeHead(302, { Location: 'http://127.0.0.1/private' }); res.end();
    } else res.end('<title>Normal product</title>');
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => { server.closeAllConnections(); return new Promise(resolve => server.close(resolve)); });
  const fetch = (await import('node-fetch')).default;
  const options = {
    resolver: async () => publicRecords,
    transport: async (url, request) => {
      // The fixture owns connection creation; production never has this override.
      request.agent.createConnection = (socketOptions, callback) => {
        socketOptions.lookup(socketOptions.host, { all: true }, (error, addresses) => {
          assert.ifError(error);
          assert.deepEqual(addresses, publicRecords);
          connections++;
          const socket = net.createConnection({ host: '127.0.0.1', port: server.address().port });
          socket.once('connect', () => callback(null, socket));
          socket.once('error', callback);
        });
      };
      return fetch(url, request);
    },
    maxBytes: 80
  };
  assert.equal((await fetchPublicHtml('http://product.example.test/product', options)).html, '<title>Normal product</title>');
  for (const pathname of ['/gzip', '/chunked']) {
    await assert.rejects(fetchPublicHtml('http://product.example.test' + pathname, options), { code: 'METADATA_TOO_LARGE' });
  }
  await assert.rejects(fetchPublicHtml('http://product.example.test/redirect', options), { code: 'METADATA_URL_BLOCKED' });
  assert.equal(connections, 4);
});
