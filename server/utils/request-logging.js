function safeRequestUrl(req, oidcEnabled) {
  if (oidcEnabled && /^\/api\/auth\/sso\/callback\/?$/i.test(req.path)) return req.path;
  return req.originalUrl;
}

module.exports = { safeRequestUrl };
