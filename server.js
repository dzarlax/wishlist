// Load environment variables from .env file
require('dotenv').config();

const express = require('express');
const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const morgan = require('morgan');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const cheerio = require('cheerio');
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
  } catch {
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

// Extract metadata from URL (Open Graph, etc.)
app.post('/api/extract-metadata', async (req, res) => {
  const { url } = req.body;

  if (!url || !url.trim()) {
    return res.status(400).json({ error: 'URL is required' });
  }

  // Basic URL validation
  try {
    new URL(url);
  } catch {
    return res.status(400).json({ error: 'Invalid URL' });
  }

  try {
    const fetch = (await import('node-fetch')).default;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 10000 // 10 second timeout
    });

    if (!response.ok) {
      return res.status(400).json({ error: 'Failed to fetch URL' });
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Extract Open Graph metadata
    const metadata = {
      title: $('meta[property="og:title"]').attr('content') ||
              $('meta[name="twitter:title"]').attr('content') ||
              $('title').text() ||
              null,
      description: $('meta[property="og:description"]').attr('content') ||
                   $('meta[name="twitter:description"]').attr('content') ||
                   $('meta[name="description"]').attr('content') ||
                   null,
      image: $('meta[property="og:image"]').attr('content') ||
             $('meta[name="twitter:image"]').attr('content') ||
             $('link[rel="image_src"]').attr('href') ||
             null,
      url: $('meta[property="og:url"]').attr('content') || url
    };

    // Resolve relative URLs for images
    if (metadata.image && !metadata.image.startsWith('http')) {
      try {
        const baseUrl = new URL(url);
        metadata.image = new URL(metadata.image, baseUrl.origin).href;
      } catch {
        metadata.image = null;
      }
    }

    res.json(metadata);
  } catch (error) {
    console.error('Metadata extraction error:', error);
    res.status(500).json({ error: 'Failed to extract metadata' });
  }
});

// AI-powered gift parsing endpoint
app.post('/api/parse-gift', async (req, res) => {
  const { text, locale = 'ru' } = req.body;

  if (!text || text.trim().length === 0) {
    return res.status(400).json({ error: 'Text is required' });
  }

  if (!config.geminiApiKey) {
    return res.status(500).json({ error: 'Gemini API key not configured' });
  }

  try {
    const genAI = new GoogleGenerativeAI(config.geminiApiKey);
    const model = genAI.getGenerativeModel({ model: config.geminiModel });

    // Check if text is a URL and extract metadata
    let metadata = {};
    let isUrl = false;
    try {
      new URL(text.trim());
      isUrl = true;

      // Try to extract metadata from URL
      try {
        const fetch = (await import('node-fetch')).default;
        const response = await fetch(text.trim(), {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          },
          timeout: 10000
        });

        if (response.ok) {
          const html = await response.text();
          const $ = cheerio.load(html);

          metadata = {
            title: $('meta[property="og:title"]').attr('content') ||
                    $('meta[name="twitter:title"]').attr('content') ||
                    $('title').text() ||
                    null,
            description: $('meta[property="og:description"]').attr('content') ||
                         $('meta[name="twitter:description"]').attr('content') ||
                         $('meta[name="description"]').attr('content') ||
                         null,
            image: $('meta[property="og:image"]').attr('content') ||
                   $('meta[name="twitter:image"]').attr('content') ||
                   $('link[rel="image_src"]').attr('href') ||
                   null
          };

          // Resolve relative URLs for images
          if (metadata.image && !metadata.image.startsWith('http')) {
            try {
              const baseUrl = new URL(text.trim());
              metadata.image = new URL(metadata.image, baseUrl.origin).href;
            } catch {
              metadata.image = null;
            }
          }
        }
      } catch {
        console.log('Could not extract metadata, continuing with AI only');
      }
    } catch {
      // Not a URL, continue with AI only
    }

    // Build prompt with metadata context
    let inputText = text;
    if (isUrl && metadata.title) {
      inputText = `URL: ${text}\n\nPage Info:\nTitle: ${metadata.title}\nDescription: ${metadata.description || 'N/A'}\nImage: ${metadata.image || 'N/A'}\n\nUser can provide more context about this gift.`;
    }

    // Determine description language based on locale
    const languageMap = {
      'ru': 'Russian',
      'en': 'English',
      'sr': 'Serbian'
    };
    const descriptionLanguage = languageMap[locale] || 'Russian';

    const prompt = `Extract gift information from the following text or link and GENERATE a personal, practical description in ${descriptionLanguage}. Return ONLY valid JSON without any additional text or formatting.

Available categories: electronics, home, accessories, education, games, clothing, sports, creativity
Available priorities: hot (🔥 Очень хочу), medium (⭐ Было бы здорово), low (💭 Просто мечта)

Text/Link: ${inputText}

${isUrl && metadata.image ? `IMPORTANT: The image URL "${metadata.image}" was found on the page. Include it in the image_url field.` : ''}

Return JSON in this exact format:
{
  "name": "gift name",
  "description": "personal explanation of why someone would want this and how it would be useful in their daily life",
  "price": "price with currency symbol (e.g., 5000 ₽, $100)",
  "category": "one of the available categories",
  "priority": "hot, medium, or low",
  "link": "product URL or null",
  "image_url": "product image URL or null"
}

Rules:
- ALWAYS generate a personal description in ${descriptionLanguage}, even if one exists on the product page
- Focus on WHY someone would want this: what problems it solves, how it fits into their life, what they can do with it
- AVOID marketing language and promotional phrases
- Think from the wishlist owner's perspective: "I want this because..."
- Mention practical use cases and personal benefits, not just technical features
- Keep descriptions concise (1-2 sentences) but personal and meaningful
- If input is a URL, extract product info (name, price, image) and write original description in ${descriptionLanguage}
- For image_url: look for image links in the text, or common product image patterns like:
  * amazon.com/images/...
  * .jpg, .png, .webp URLs
  * cdn URLs, product photos
- If no image is explicitly mentioned or found, set image_url to null (DO NOT make up URLs)
- Detect category from keywords (console, laptop, phone -> electronics, book -> education, etc.)
- Priority hot: phrases like "очень хочу", "need", "must have", "хочу"
- Priority medium: phrases like "было бы здорово", "would be nice", "хотелось бы"
- Priority low: phrases like "мечта", "someday", "just thinking", "мечтаю"
- Default to medium priority if unclear
- Return null for missing optional fields (price, link, image_url), but ALWAYS include description
- Return ONLY JSON, no explanations

Examples:
Text: "Хочу iPhone 15 Pro 256GB"
Response: {"name": "iPhone 15 Pro 256GB", "description": "Нужен для работы и творчества — быстрая обработка фото, удобная multitasking и отличная камера для ежедневных снимков", "price": null, "category": "electronics", "priority": "hot", "link": null, "image_url": null}

Text: "https://example.com/product/playstation-5"
Response: {"name": "PlayStation 5", "description": "Хочу для вечеров с друзьями и эксклюзивных игр, которые не выходят на PC — расслабиться и поиграть в любимые серии", "price": null, "category": "games", "priority": "medium", "link": "https://example.com/product/playstation-5", "image_url": null}

Text: "I really want a mechanical keyboard"
Response: {"name": "Mechanical Keyboard", "description": "Устал от мягких клавиш — хочу тактильные ощущения и комфорт при печатании кода весь день, плюс подсветка для вечерней работы", "price": null, "category": "electronics", "priority": "hot", "link": null, "image_url": null}

Text: "Нужна хорошая кофеварка"
Response: {"name": "Кофеварка", "description": "Чтобы не тратить время на очередь в кофейню каждое утро и сэкономить деньги — свежий кофе дома перед работой", "price": null, "category": "home", "priority": "medium", "link": null, "image_url": null}`;

    const result = await model.generateContent(prompt);
    const response = result.response.text().trim();

    // Clean up response (remove markdown code blocks if present)
    const cleanedResponse = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    let parsedData;
    try {
      parsedData = JSON.parse(cleanedResponse);
    } catch {
      console.error('Failed to parse Gemini response:', cleanedResponse);
      return res.status(500).json({ error: 'Failed to parse AI response' });
    }

    // Validate and sanitize response
    const validCategories = ['electronics', 'home', 'accessories', 'education', 'games', 'clothing', 'sports', 'creativity'];
    const validPriorities = ['hot', 'medium', 'low'];

    if (!parsedData.name) {
      return res.status(500).json({ error: 'AI could not extract gift name' });
    }

    // Ensure category is valid, default to 'electronics'
    if (!parsedData.category || !validCategories.includes(parsedData.category)) {
      parsedData.category = 'electronics';
    }

    // Ensure priority is valid, default to 'medium'
    if (!parsedData.priority || !validPriorities.includes(parsedData.priority)) {
      parsedData.priority = 'medium';
    }

    // If AI didn't find an image but we extracted one from metadata, use it
    if ((!parsedData.image_url || parsedData.image_url === null) && metadata.image) {
      parsedData.image_url = metadata.image;
    }

    res.json(parsedData);
  } catch (error) {
    console.error('Gemini API error:', error);
    res.status(500).json({ error: 'Failed to process gift with AI' });
  }
});

// 404 handler for undefined /api/* routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

// Global error handler
app.use((err, req, res, _next) => {
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
