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
  dbPath: path.join(__dirname, '../../wishlist.db'),

  // Admin (legacy fallback)
  adminPassword: process.env.ADMIN_PASSWORD || 'wishlist2025',

  // Auth
  jwtSecret: process.env.JWT_SECRET || 'wishlist-dev-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',

  // Authentik SSO (OAuth2/OIDC)
  authentikEnabled: process.env.AUTHENTIK_ENABLED === 'true',
  authentikUrl: process.env.AUTHENTIK_URL || null,
  authentikClientId: process.env.AUTHENTIK_CLIENT_ID || null,
  authentikClientSecret: process.env.AUTHENTIK_CLIENT_SECRET || null,
  appUrl: process.env.APP_URL || 'https://wishlist.dzarlax.dev',

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
}

module.exports = { config, validateConfig };
