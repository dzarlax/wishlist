function safeRequestUrl(req, oidcEnabled) {
  if (oidcEnabled && /^\/api\/auth\/sso\/callback\/?$/i.test(req.path)) return req.path;
  if (/^\/api\/auth\/reset-password\/?$/i.test(req.path)) return req.path;
  return req.originalUrl;
}

module.exports = { safeRequestUrl };
