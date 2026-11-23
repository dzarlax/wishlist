const assert = require('node:assert/strict');
const test = require('node:test');
const { Writable } = require('node:stream');
const morgan = require('morgan');
const { safeRequestUrl } = require('../server/utils/request-logging');

function logRequest(originalUrl, oidcEnabled = true) {
  let output = '';
  const stream = new Writable({
    write(chunk, _encoding, callback) {
      output += chunk.toString();
      callback();
    }
  });
  morgan.token('safe-url', req => safeRequestUrl(req, oidcEnabled));
  const logger = morgan(':method :safe-url :status :response-time ms - :res[content-length]', {
    immediate: true,
    stream
  });
  const req = {
    method: 'GET', originalUrl, url: originalUrl,
    path: originalUrl.split('?')[0], headers: {}
  };
  const res = { headersSent: true, statusCode: 200, getHeader: () => '0' };
  logger(req, res, () => {});
  stream.end();
  return output;
}

test('request logging escapes Unicode separators in the production custom token', () => {
  for (const [separator, escaped] of [['\u0085', '\\u0085'], ['\u2028', '\\u2028'], ['\u2029', '\\u2029']]) {
    const output = logRequest(`/gifts?name=gift${separator}FORGED`);
    assert.equal(output.split(/[\r\n\u0085\u2028\u2029]/u).length, 2, 'one logical record plus its trailing newline');
    assert.equal(output.includes(separator), false);
    assert.ok(output.includes(`gift${escaped}FORGED`));
  }
});

test('request logging preserves ordinary URLs and redacts enabled SSO callback queries', () => {
  assert.equal(logRequest('/gifts?category=books'), 'GET /gifts?category=books 200 - ms - 0\n');
  const callback = '/api/auth/sso/callback?code=synthetic-code&state=synthetic-state';
  assert.equal(logRequest(callback), 'GET /api/auth/sso/callback 200 - ms - 0\n');
  assert.equal(logRequest(callback, false), `GET ${callback} 200 - ms - 0\n`);
});
