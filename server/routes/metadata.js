const { MetadataError } = require('../utils/publicFetch');
const { extractMetadata } = require('../utils/metadata');

function requireMetadataUser(req, res, next) {
  if (!req.authUser || !req.currentUser) {
    return res.status(401).json({ error: 'Authentication required', code: 'METADATA_AUTH_REQUIRED' });
  }
  next();
}

function metadataErrorHandler(error, req, res, next) {
  if (!(error instanceof MetadataError)) return next(error);
  res.status(error.status).json({ error: error.message, code: error.code });
}

function createMetadataService({ extract = extractMetadata, now = Date.now, maxConcurrent = 4 } = {}) {
  const users = new Map();
  let active = 0;
  async function run(url, userId) {
    const time = now();
    for (const [id, value] of users) if (value.expires <= time) users.delete(id);
    const key = String(userId);
    const window = users.get(key) || { count: 0, expires: time + 60000 };
    if (active >= maxConcurrent || window.count >= 10 || (!users.has(key) && users.size >= 10000)) {
      throw new MetadataError('METADATA_RATE_LIMIT', 429);
    }
    window.count++;
    users.set(key, window);
    active++;
    try { return await extract(url); } finally { active--; }
  }
  return {
    async extractHandler(req, res, next) {
      try { res.json(await run(req.body?.url, req.currentUser.id)); } catch (error) { next(error); }
    },
    async forGift(text, userId) {
      let isUrl;
      try { new URL(text.trim()); isUrl = true; } catch { isUrl = false; }
      if (!isUrl) return { isUrl: false, metadata: {} };
      try { return { isUrl: true, metadata: await run(text.trim(), userId) }; } catch (error) {
        if (!(error instanceof MetadataError) || error.status < 500) throw error;
        return { isUrl: true, metadata: {} };
      }
    }
  };
}

module.exports = { createMetadataService, requireMetadataUser, metadataErrorHandler };
