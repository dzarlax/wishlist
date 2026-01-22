// Load environment variables from .env file
require('dotenv').config();

const express = require('express');
const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const DB_FILE = path.join(__dirname, 'wishlist.db');

// 🔒 ADMIN PASSWORD - Load from .env or Docker environment
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'wishlist2025';

console.log('🔐 Admin password protection enabled');
console.log('💡 Set ADMIN_PASSWORD in .env file or Docker environment to change the password');

let db;

// Helper function to escape SQL strings
function escapeString(str) {
  if (str === null || str === undefined) return 'NULL';
  return `'${String(str).replace(/'/g, "''")}'`;
}

// Helper function to get gift by ID
function getGiftById(id) {
  const results = db.exec(`SELECT * FROM gifts WHERE id = ${id}`);
  if (!results[0] || !results[0].values[0]) return null;

  const row = results[0].values[0];
  return {
    id: row[0],
    name: row[1],
    description: row[2],
    category: row[3],
    priority: row[4],
    link: row[5],
    image_url: row[6],
    price: row[7],
    reserved: Boolean(row[8]),
    secret_code: row[9],
    reserved_by: row[10],
    reserved_at: row[11],
    status: row[12],
    created_at: row[13]
  };
}

// Initialize database
async function initDB() {
  const SQL = await initSqlJs();

  // Load existing DB or create new
  if (fs.existsSync(DB_FILE)) {
    const buffer = fs.readFileSync(DB_FILE);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
    createTables();
  }

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

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// API Routes
app.get('/api/gifts', (req, res) => {
  const results = db.exec('SELECT * FROM gifts ORDER BY priority DESC, created_at DESC');
  const gifts = results[0] ? results[0].values.map(row => ({
    id: row[0],
    name: row[1],
    description: row[2],
    category: row[3],
    priority: row[4],
    link: row[5],
    image_url: row[6],
    price: row[7],
    reserved: Boolean(row[8]),
    secret_code: row[9],
    reserved_by: row[10],
    reserved_at: row[11],
    status: row[12],
    created_at: row[13]
  })) : [];
  res.json(gifts);
});

app.get('/api/gifts/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const gift = getGiftById(id);

  if (!gift) return res.status(404).json({ error: 'Not found' });
  res.json(gift);
});

app.post('/api/gifts', (req, res) => {
  const { admin_password, name, description, category, priority, link, image_url, price } = req.body;

  // Verify admin password
  if (admin_password !== ADMIN_PASSWORD) {
    return res.status(403).json({ error: 'Unauthorized: Invalid admin password' });
  }

  const query = `
    INSERT INTO gifts (name, description, category, priority, link, image_url, price)
    VALUES (${escapeString(name)}, ${escapeString(description)}, ${escapeString(category)},
            ${escapeString(priority)}, ${escapeString(link)}, ${escapeString(image_url)},
            ${escapeString(price)})
  `;

  db.run(query);
  saveDB();

  const lastId = db.exec('SELECT last_insert_rowid() as id')[0].values[0][0];
  const gift = getGiftById(lastId);

  res.json(gift);
});

app.post('/api/gifts/:id/reserve', (req, res) => {
  const { secret_code, reserved_by } = req.body;
  const id = parseInt(req.params.id);

  const gift = getGiftById(id);
  if (!gift) return res.status(404).json({ error: 'Not found' });
  if (gift.reserved) return res.status(400).json({ error: 'Already reserved' });

  const query = `
    UPDATE gifts
    SET reserved = 1, secret_code = ${escapeString(secret_code)},
        reserved_by = ${escapeString(reserved_by || 'Аноним')},
        reserved_at = CURRENT_TIMESTAMP, status = 'reserved'
    WHERE id = ${id}
  `;

  db.run(query);
  saveDB();

  const updated = getGiftById(id);
  res.json(updated);
});

app.post('/api/gifts/:id/unreserve', (req, res) => {
  const { secret_code } = req.body;
  const id = parseInt(req.params.id);

  const gift = getGiftById(id);
  if (!gift) return res.status(404).json({ error: 'Not found' });
  if (!gift.reserved) return res.status(400).json({ error: 'Not reserved' });
  if (gift.secret_code !== secret_code) return res.status(403).json({ error: 'Unauthorized' });

  const query = `
    UPDATE gifts
    SET reserved = 0, secret_code = NULL, reserved_by = NULL,
        reserved_at = NULL, status = 'available'
    WHERE id = ${id}
  `;

  db.run(query);
  saveDB();

  const updated = getGiftById(id);
  res.json(updated);
});

app.post('/api/gifts/:id/purchased', (req, res) => {
  const { secret_code } = req.body;
  const id = parseInt(req.params.id);

  const gift = getGiftById(id);
  if (!gift) return res.status(404).json({ error: 'Not found' });
  if (!gift.reserved) return res.status(400).json({ error: 'Not reserved' });
  if (gift.secret_code !== secret_code) return res.status(403).json({ error: 'Unauthorized' });

  db.run(`UPDATE gifts SET status = 'purchased' WHERE id = ${id}`);
  saveDB();

  const updated = getGiftById(id);
  res.json(updated);
});

app.delete('/api/gifts/:id', (req, res) => {
  const { admin_password } = req.body;
  const id = parseInt(req.params.id);

  // Verify admin password
  if (admin_password !== ADMIN_PASSWORD) {
    return res.status(403).json({ error: 'Unauthorized: Invalid admin password' });
  }

  db.run(`DELETE FROM gifts WHERE id = ${id}`);
  saveDB();
  res.status(204).send();
});

app.put('/api/gifts/:id', (req, res) => {
  const { admin_password, name, description, category, priority, link, image_url, price } = req.body;
  const id = parseInt(req.params.id);

  // Verify admin password
  if (admin_password !== ADMIN_PASSWORD) {
    return res.status(403).json({ error: 'Unauthorized: Invalid admin password' });
  }

  const query = `
    UPDATE gifts
    SET name = ${escapeString(name)},
        description = ${escapeString(description)},
        category = ${escapeString(category)},
        priority = ${escapeString(priority)},
        link = ${escapeString(link)},
        image_url = ${escapeString(image_url)},
        price = ${escapeString(price)}
    WHERE id = ${id}
  `;

  db.run(query);
  saveDB();

  const updated = getGiftById(id);
  if (!updated) return res.status(404).json({ error: 'Not found' });
  res.json(updated);
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
