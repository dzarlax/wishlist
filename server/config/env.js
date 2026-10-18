const path = require('path');

// Load environment variables from .env file if dotenv exists
try {
  require('dotenv').config();
} catch {
  // dotenv is optional
}

// Configuration with validation
const config = {
  // Server
  port: parseInt(process.env.PORT) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',

  // Database
  databaseUrl: process.env.DATABASE_URL || null,
  dbPath: process.env.WISHLIST_DB_PATH || path.join(__dirname, '../../wishlist.db'),

  // Admin (legacy fallback)
  adminPassword: process.env.ADMIN_PASSWORD || 'wishlist2025',

  // Auth
  jwtSecret: process.env.JWT_SECRET || 'wishlist-dev-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',

  // Authentik SSO (legacy OAuth2/OIDC)
  authentikEnabled: process.env.AUTHENTIK_ENABLED === 'true',
  authentikUrl: process.env.AUTHENTIK_URL || null,
  authentikClientId: process.env.AUTHENTIK_CLIENT_ID || null,
  authentikClientSecret: process.env.AUTHENTIK_CLIENT_SECRET || null,
  // Generic OIDC is opt-in; development defaults never point at a personal domain.
  oidcEnabledValue: process.env.OIDC_ENABLED,
  oidcEnabled: process.env.OIDC_ENABLED === 'true',
  oidcIssuer: process.env.OIDC_ISSUER || null,
  oidcClientId: process.env.OIDC_CLIENT_ID || null,
  oidcClientSecret: process.env.OIDC_CLIENT_SECRET || null,
  appUrl: process.env.APP_URL || 'http://localhost:3000',

  // Gemini API
  geminiApiKey: process.env.GEMINI_API_KEY || null,
  geminiModel: process.env.GEMINI_MODEL || 'gemini-2.5-flash',

  // CORS - allow all origins in production, or specific ones via env var
  allowedOrigins: process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : process.env.NODE_ENV === 'production'
    ? ['*']
    : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:5176', 'http://localhost:3000'],

  // Users - format: "slug:Name:password:emoji:email,slug:Name:password:emoji:email"
  defaultUsers: process.env.USERS || null,

  // Logging
  skipMorganInTest: process.env.NODE_ENV === 'test'
};

// Validate critical configuration
function validateConfig() {
  validateAuthConfig(config);
  const warnings = [];

  if (config.jwtSecret === 'wishlist-dev-secret-change-me' && config.nodeEnv === 'production') {
    warnings.push('JWT_SECRET is using default value in production — set a secure secret!');
  }

  if (warnings.length > 0) {
    console.warn('⚠️  Configuration warnings:');
    warnings.forEach(w => console.warn(`  - ${w}`));
  }

  const dbType = config.databaseUrl ? 'PostgreSQL' : 'SQLite';
  console.log(`🗄️  Database: ${dbType}`);
  console.log(`🌡️  Environment: ${config.nodeEnv}`);
  console.log(`🔗 Allowed origins: ${config.allowedOrigins.join(', ')}`);
  if (config.authentikEnabled) {
    console.log(`🔐 Authentik SSO: enabled (${config.authentikUrl})`);
  }
  if (config.oidcEnabled) {
    console.log('🔐 OIDC SSO: enabled');
  }
}

function validateAuthConfig(settings) {
  const oidcFields = [settings.oidcIssuer, settings.oidcClientId, settings.oidcClientSecret];
  const legacyFields = [settings.authentikUrl, settings.authentikClientId, settings.authentikClientSecret];
  const oidcConfigured = oidcFields.filter(Boolean).length;
  const legacyConfigured = legacyFields.filter(Boolean).length;

  if (settings.oidcEnabledValue !== undefined && !['true', 'false'].includes(settings.oidcEnabledValue)) {
    throw new Error('OIDC_ENABLED must be true or false');
  }

  if (settings.oidcEnabled && settings.authentikEnabled) {
    throw new Error('OIDC_ENABLED and AUTHENTIK_ENABLED cannot both be true');
  }
  if ((settings.oidcEnabled && oidcConfigured !== oidcFields.length) || (!settings.oidcEnabled && oidcConfigured > 0 && oidcConfigured < oidcFields.length)) {
    throw new Error('OIDC configuration is incomplete');
  }
  if ((settings.authentikEnabled && legacyConfigured !== legacyFields.length) || (!settings.authentikEnabled && legacyConfigured > 0 && legacyConfigured < legacyFields.length)) {
    throw new Error('Authentik configuration is incomplete');
  }

  if (settings.oidcEnabled) {
    let issuer;
    let appUrl;
    try {
      issuer = new URL(settings.oidcIssuer);
      appUrl = new URL(settings.appUrl);
    } catch {
      throw new Error('OIDC issuer and APP_URL must be valid absolute URLs');
    }
    if (issuer.protocol !== 'https:' || issuer.username || issuer.password || issuer.search || issuer.hash) {
      throw new Error('OIDC_ISSUER must be a fixed HTTPS issuer URL');
    }
    if (appUrl.protocol !== 'https:' || appUrl.username || appUrl.password || appUrl.search || appUrl.hash || appUrl.pathname !== '/') {
      throw new Error('APP_URL must be a fixed HTTPS origin when OIDC is enabled');
    }
  }
  return true;
}

module.exports = { config, validateConfig, validateAuthConfig };
