const dns = require('node:dns').promises;
const http = require('node:http');
const https = require('node:https');
const net = require('node:net');
const ipaddr = require('ipaddr.js');

const DENIED_SUFFIXES = ['localhost', 'local', 'internal', 'home.arpa', 'dzarlax.dev', 'jerky.in.rs'];
// Public origins are also forbidden: they can route back into our own services.
const ORIGIN_ADDRESSES = ['65.109.0.90', '2a01:4f9:c011:bd77::1'].map(ip => ipaddr.parse(ip).toNormalizedString());
const IPV6_GLOBAL = ipaddr.parseCIDR('2000::/3');
const IPV6_SPECIAL = ['2001::/23', '2002::/16', '3fff::/20'].map(cidr => ipaddr.parseCIDR(cidr));
const MAX_BYTES = 2 * 1024 * 1024;

const MESSAGES = {
  METADATA_INVALID_URL: 'Enter a valid public HTTP or HTTPS URL.',
  METADATA_URL_BLOCKED: 'This URL is not allowed for metadata retrieval.',
  METADATA_TIMEOUT: 'The page took too long to respond.',
  METADATA_TOO_LARGE: 'The page is too large for metadata retrieval.',
  METADATA_UPSTREAM_ERROR: 'Could not retrieve HTML metadata from this page.',
  METADATA_RATE_LIMIT: 'Too many metadata requests. Please try again later.'
};

class MetadataError extends Error {
  constructor(code, status = 400) {
    super(MESSAGES[code]);
    this.name = 'MetadataError';
    this.code = code;
    this.status = status;
  }
}

function isPublicAddress(value) {
  try {
    let address = ipaddr.parse(value);
    if (address.kind() === 'ipv6' && address.isIPv4MappedAddress()) address = address.toIPv4Address();
    if (address.range() !== 'unicast' || ORIGIN_ADDRESSES.includes(address.toNormalizedString())) return false;
    if (address.kind() === 'ipv6') {
      return address.match(IPV6_GLOBAL) && !IPV6_SPECIAL.some(range => address.match(range));
    }
    return true;
  } catch {
    return false;
  }
}

function validateUrl(input) {
  if (typeof input !== 'string' || !input.trim() || input.length > 4096) {
    throw new MetadataError('METADATA_INVALID_URL');
  }
  let url;
  try { url = new URL(input); } catch { throw new MetadataError('METADATA_INVALID_URL'); }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.port) {
    throw new MetadataError('METADATA_URL_BLOCKED');
  }
  const hostname = url.hostname.replace(/^\[|\]$/g, '').replace(/\.+$/, '').toLowerCase();
  const literal = net.isIP(hostname);
  if (literal ? !isPublicAddress(hostname) : (!hostname.includes('.') || DENIED_SUFFIXES.some(
    suffix => hostname === suffix || hostname.endsWith('.' + suffix)
  ))) throw new MetadataError('METADATA_URL_BLOCKED');
  if (!hostname) throw new MetadataError('METADATA_URL_BLOCKED');
  url.hash = '';
  return { url, hostname, literal };
}

function abortable(promise, signal) {
  if (signal.aborted) return Promise.reject(signal.reason);
  return new Promise((resolve, reject) => {
    const abort = () => reject(signal.reason);
    signal.addEventListener('abort', abort, { once: true });
    Promise.resolve(promise).then(resolve, reject).finally(() => signal.removeEventListener('abort', abort));
  });
}

function createPinnedAgent(url, hostname, addresses) {
  const lookup = (requestedHost, options, callback) => {
    if (typeof options === 'function') { callback = options; options = {}; }
    if (typeof options === 'number') options = { family: options };
    const family = options?.family;
    const allowed = addresses.filter(entry => !family || entry.family === family);
    if (requestedHost.replace(/\.+$/, '').toLowerCase() !== hostname || !allowed.length) {
      return callback(new MetadataError('METADATA_UPSTREAM_ERROR', 502));
    }
    if (options?.all) return callback(null, allowed.map(entry => ({ ...entry })));
    callback(null, allowed[0].address, allowed[0].family);
  };
  const options = { lookup, keepAlive: false };
  return url.protocol === 'https:' ? new https.Agent(options) : new http.Agent(options);
}

async function readHtml(response, signal, maxBytes) {
  const chunks = [];
  let bytes = 0;
  if (!response.body) throw new MetadataError('METADATA_UPSTREAM_ERROR', 502);
  const iterator = response.body[Symbol.asyncIterator]();
  for (;;) {
    const { done, value } = await abortable(iterator.next(), signal);
    if (done) break;
    const chunk = Buffer.isBuffer(value) ? value : Buffer.from(value);
    bytes += chunk.length;
    if (bytes > maxBytes) throw new MetadataError('METADATA_TOO_LARGE', 502);
    chunks.push(chunk);
  }
  return Buffer.concat(chunks, bytes).toString('utf8');
}

async function fetchPublicHtml(input, {
  resolver = dns.lookup,
  transport = async (...args) => (await import('node-fetch')).default(...args),
  timeoutMs = 10000,
  maxBytes = MAX_BYTES
} = {}) {
  let target = validateUrl(input);
  const controller = new AbortController();
  const { signal } = controller;
  const timer = setTimeout(() => controller.abort(new MetadataError('METADATA_TIMEOUT', 504)), timeoutMs);
  try {
    for (let redirects = 0; ; redirects++) {
      const { url, hostname, literal } = target;
      const addresses = literal ? [{ address: hostname, family: literal }] : await abortable(
        resolver(hostname, { all: true, verbatim: true }), signal
      );
      if (!Array.isArray(addresses) || !addresses.length) throw new MetadataError('METADATA_UPSTREAM_ERROR', 502);
      if (addresses.some(entry => !isPublicAddress(entry.address) || net.isIP(entry.address) !== entry.family)) {
        throw new MetadataError('METADATA_URL_BLOCKED');
      }
      const agent = createPinnedAgent(url, hostname, addresses);
      let response;
      try {
        response = await abortable(transport(url, {
          method: 'GET', redirect: 'manual', agent, signal, size: maxBytes,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            Accept: 'text/html, application/xhtml+xml'
          }
        }), signal);
        if ([301, 302, 303, 307, 308].includes(response.status)) {
          const location = response.headers.get('location');
          if (redirects >= 3 || !location) throw new MetadataError('METADATA_URL_BLOCKED');
          let next;
          try { next = new URL(location, url).href; } catch { throw new MetadataError('METADATA_INVALID_URL'); }
          target = validateUrl(next);
          if (url.protocol === 'https:' && target.url.protocol !== 'https:') throw new MetadataError('METADATA_URL_BLOCKED');
          continue;
        }
        const contentType = (response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
        if (!response.ok || !['text/html', 'application/xhtml+xml'].includes(contentType)) {
          throw new MetadataError('METADATA_UPSTREAM_ERROR', 502);
        }
        return { html: await readHtml(response, signal, maxBytes), finalUrl: url.href };
      } finally {
        response?.body?.destroy();
        agent.destroy();
      }
    }
  } catch (error) {
    if (signal.aborted) throw signal.reason;
    if (error instanceof MetadataError) throw error;
    if (error?.type === 'max-size') throw new MetadataError('METADATA_TOO_LARGE', 502);
    throw new MetadataError('METADATA_UPSTREAM_ERROR', 502);
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { MetadataError, fetchPublicHtml, validateUrl, isPublicAddress, createPinnedAgent };
