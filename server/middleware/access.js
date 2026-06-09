function requireAdmin(req, res, next) {
  if (!req.currentUser) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  if (!req.currentUser.is_admin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

function requireAiAccess(req, res, next) {
  if (!req.currentUser) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  if (!req.currentUser.can_use_ai) {
    return res.status(403).json({ error: 'AI access required' });
  }
  next();
}

module.exports = { requireAdmin, requireAiAccess };
