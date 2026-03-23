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
  dbPath: path.join(__dirname, '../../wishlist.db'),

  // Admin
  adminPassword: process.env.ADMIN_PASSWORD || 'wishlist2025',

  // Gemini API
  geminiApiKey: process.env.GEMINI_API_KEY || null,
  geminiModel: process.env.GEMINI_MODEL || 'gemini-2.5-flash',

  // CORS - allow all origins in production, or specific ones via env var
  allowedOrigins: process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : process.env.NODE_ENV === 'production'
    ? ['*']  // Allow all origins in production (frontend served from same origin)
    : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:5176', 'http://localhost:3000'],

  // Users - format: "slug:Name:password:emoji,slug:Name:password:emoji"
  defaultUsers: process.env.USERS || null,

  // Logging
  skipMorganInTest: process.env.NODE_ENV === 'test'
};

// Validate critical configuration
function validateConfig() {
  const errors = [];

  if (!config.adminPassword || config.adminPassword.length < 3) {
    errors.push('ADMIN_PASSWORD must be at least 3 characters long');
  }

  if (errors.length > 0) {
    console.error('❌ Configuration errors:');
    errors.forEach(err => console.error(`  - ${err}`));
    process.exit(1);
  }

  // Log configuration info
  console.log('🔐 Admin password protection enabled');
  console.log('💡 Set ADMIN_PASSWORD in .env file or Docker environment to change the password');
  console.log(`🌡️  Environment: ${config.nodeEnv}`);
  console.log(`🔗 Allowed origins: ${config.allowedOrigins.join(', ')}`);
}

module.exports = { config, validateConfig };
