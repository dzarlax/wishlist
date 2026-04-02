const jwt = require('jsonwebtoken');
const { config } = require('../config/env');

/**
 * Generate a JWT token for a user.
 */
function generateToken(user) {
  return jwt.sign(
    { id: user.id, slug: user.slug },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );
}

/**
 * Middleware: extract and verify JWT from Authorization header.
 * Sets req.authUser = { id, slug } if valid, null otherwise.
 * Does NOT block — use requireOwner for protected routes.
 */
function extractAuth(req, res, next) {
  req.authUser = null;

  const header = req.get('Authorization');
  if (header && header.startsWith('Bearer ')) {
    const token = header.slice(7);
    try {
      req.authUser = jwt.verify(token, config.jwtSecret);
    } catch {
      // Invalid/expired token — treat as guest
    }
  }

  next();
}

/**
 * Middleware: require authenticated owner of the current wishlist.
 * Must be used after resolveUser (sets req.wishlistUser).
 */
function requireOwner(req, res, next) {
  if (!req.authUser) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  if (req.wishlistUser && req.authUser.id !== req.wishlistUser.id) {
    return res.status(403).json({ error: 'Not your wishlist' });
  }
  next();
}

/**
 * Middleware: check for Authentik SSO headers.
 * If X-Authentik-Email is present, find user by email and set req.ssoUser.
 */
function extractSsoUser(userModel) {
  return async (req, res, next) => {
    req.ssoUser = null;

    if (!config.authentikEnabled) return next();

    const email = req.get('X-Authentik-Email');
    if (email) {
      const user = await userModel.findByEmail(email);
      if (user) {
        req.ssoUser = user;
      }
    }
    next();
  };
}

/**
 * Middleware: require any authenticated user (for global resources like categories).
 */
function requireAuth(req, res, next) {
  if (!req.authUser) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
}

module.exports = { generateToken, extractAuth, requireAuth, requireOwner, extractSsoUser };
