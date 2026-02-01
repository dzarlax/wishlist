// Load environment variables from .env file
require('dotenv').config();

const express = require('express');
const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const morgan = require('morgan');
const { adminAuthLimiter, reservationLimiter } = require('./server/middleware/rateLimiter');
const {
  validateGiftCreate,
  validateGiftUpdate,
  validateGiftId,
  validateReserve,
  validateUnreserve,
  validatePurchased
} = require('./server/middleware/validation');
const GiftModel = require('./server/models/Gift');
const MigrationManager = require('./server/migrations/migrationManager');
const { config, validateConfig } = require('./server/config/env');

// Validate configuration
validateConfig();

const app = express();
const DB_FILE = config.dbPath;
const ADMIN_PASSWORD = config.adminPassword;

let db;
let Gift;
const startTime = Date.now();

// Initialize database
async function initDB() {
  const SQL = await initSqlJs();

  // Load existing DB or create new
  if (fs.existsSync(DB_FILE)) {
    const buffer = fs.readFileSync(DB_FILE);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  // Run migrations
  const migrationManager = new MigrationManager(db, path.join(__dirname, 'server/migrations'));
  await migrationManager.migrate();

  // Initialize Gift model
  Gift = new GiftModel(db);

  // Auto-save every 5 seconds
  setInterval(saveDB, 5000);
}

function createTables() {
  db.run(`
    CREATE TABLE IF NOT EXISTS gifts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      category TEXT,
      priority TEXT DEFAULT '⭐ Было бы здорово',
      link TEXT,
      image_url TEXT,
      price TEXT,
      reserved INTEGER DEFAULT 0,
      secret_code TEXT,
      reserved_by TEXT,
      reserved_at TEXT,
      status TEXT DEFAULT 'available',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);
  saveDB();
}

function saveDB() {
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_FILE, buffer);
}

// Configure CORS with allowed origins
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps, curl requests, or same-origin requests)
    if (!origin) return callback(null, true);
    // Allow all origins if wildcard is set (production mode)
    if (config.allowedOrigins.includes('*')) return callback(null, true);
    // Check if origin is in allowed list
    if (config.allowedOrigins.indexOf(origin) === -1) {
      const msg = 'CORS policy: This origin is not allowed';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true
}));

// Logging middleware (skip in test environment)
if (!config.skipMorganInTest) {
  app.use(morgan('dev'));
}

app.use(express.json());
app.use(express.static('public'));

// Middleware to verify admin password from header
function requireAdminAuth(req, res, next) {
  const adminPassword = req.get('X-Admin-Password');
  if (!adminPassword || adminPassword !== ADMIN_PASSWORD) {
    return res.status(403).json({ error: 'Unauthorized: Invalid admin password' });
  }
  next();
}

// Health check endpoint
app.get('/health', (req, res) => {
  const uptime = Math.floor((Date.now() - startTime) / 1000);

  try {
    const giftCount = db.exec('SELECT COUNT(*) as count FROM gifts')[0]?.values[0]?.[0] || 0;

    res.json({
      status: 'ok',
      uptime: `${uptime}s`,
      database: {
        connected: true,
        gifts: giftCount
      },
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      error: 'Database connection failed'
    });
  }
});

// API Routes
app.get('/api/gifts', (req, res) => {
  const gifts = Gift.findAll().map(gift => Gift.sanitizeGift(gift));
  res.json(gifts);
});

app.get('/api/gifts/:id', validateGiftId, (req, res) => {
  const gift = Gift.findById(parseInt(req.params.id));

  if (!gift) return res.status(404).json({ error: 'Not found' });
  res.json(Gift.sanitizeGift(gift));
});

app.post('/api/gifts', adminAuthLimiter, requireAdminAuth, validateGiftCreate, (req, res) => {
  const gift = Gift.create(req.body);
  res.json(Gift.sanitizeGift(gift));
});

app.post('/api/gifts/:id/reserve', reservationLimiter, validateReserve, (req, res) => {
  const { secret_code, reserved_by } = req.body;
  const id = parseInt(req.params.id);

  const gift = Gift.findById(id);
  if (!gift) return res.status(404).json({ error: 'Not found' });
  if (gift.reserved) return res.status(400).json({ error: 'Already reserved' });

  const updated = Gift.reserve(id, secret_code, reserved_by);
  res.json(Gift.sanitizeGift(updated));
});

app.post('/api/gifts/:id/unreserve', reservationLimiter, validateUnreserve, (req, res) => {
  const { secret_code } = req.body;
  const id = parseInt(req.params.id);

  const gift = Gift.findById(id);
  if (!gift) return res.status(404).json({ error: 'Not found' });
  if (!gift.reserved) return res.status(400).json({ error: 'Not reserved' });
  if (gift.secret_code !== secret_code) return res.status(403).json({ error: 'Unauthorized' });

  const updated = Gift.unreserve(id);
  res.json(Gift.sanitizeGift(updated));
});

app.post('/api/gifts/:id/purchased', reservationLimiter, validatePurchased, (req, res) => {
  const { secret_code } = req.body;
  const id = parseInt(req.params.id);

  const gift = Gift.findById(id);
  if (!gift) return res.status(404).json({ error: 'Not found' });
  if (!gift.reserved) return res.status(400).json({ error: 'Not reserved' });
  if (gift.secret_code !== secret_code) return res.status(403).json({ error: 'Unauthorized' });

  const updated = Gift.markPurchased(id);
  res.json(Gift.sanitizeGift(updated));
});

app.delete('/api/gifts/:id', adminAuthLimiter, requireAdminAuth, (req, res) => {
  Gift.delete(parseInt(req.params.id));
  res.status(204).send();
});

app.put('/api/gifts/:id', adminAuthLimiter, requireAdminAuth, validateGiftUpdate, (req, res) => {
  const id = parseInt(req.params.id);
  const updated = Gift.update(id, req.body);

  if (!updated) return res.status(404).json({ error: 'Not found' });
  res.json(Gift.sanitizeGift(updated));
});

// 404 handler for undefined /api/* routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);

  // Handle validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: err.message });
  }

  // Handle CORS errors
  if (err.message && err.message.includes('CORS')) {
    return res.status(403).json({ error: 'Origin not allowed' });
  }

  // Default error response
  res.status(500).json({ error: 'Internal server error' });
});

// Serve static files from public directory in production
if (process.env.NODE_ENV !== 'development') {
  app.use(express.static(path.join(__dirname, 'public')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });
}

// Initialize and start server
initDB().then(() => {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`🎁 Wishlist app running on http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('Failed to initialize database:', err);
});
