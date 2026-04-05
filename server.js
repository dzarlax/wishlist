require('dotenv').config();

const express = require('express');
const path = require('path');
const cors = require('cors');
const morgan = require('morgan');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { adminAuthLimiter, reservationLimiter } = require('./server/middleware/rateLimiter');
const {
  validateGiftCreate,
  validateGiftUpdate,
  validateGiftId,
  validateReserve,
  validateUnreserve,
  validatePurchased
} = require('./server/middleware/validation');
const { generateToken, extractAuth, requireAuth, requireOwner, extractSsoUser } = require('./server/middleware/auth');
const GiftModel = require('./server/models/Gift');
const UserModel = require('./server/models/User');
const CategoryModel = require('./server/models/Category');
const PriorityModel = require('./server/models/Priority');
const MigrationManager = require('./server/migrations/migrationManager');
const { initDatabase } = require('./server/db');
const { config, validateConfig } = require('./server/config/env');
const { extractMetadata } = require('./server/utils/metadata');
const { translateText } = require('./server/utils/translate');

validateConfig();

const app = express();

let db;
let Gift, User, Category, Priority;
let saveDB = null;
const startTime = Date.now();

// Initialize database
async function initDB() {
  const result = await initDatabase({ dbPath: config.dbPath });
  db = result.db;
  saveDB = result.saveDB;

  // Run migrations
  const migrationManager = new MigrationManager(db, path.join(__dirname, 'server/migrations'));
  await migrationManager.migrate();

  // Initialize models
  Gift = new GiftModel(db);
  User = new UserModel(db);
  Category = new CategoryModel(db);
  Priority = new PriorityModel(db);

  // Seed users from USERS env var: "slug:Name:password:emoji:email,..."
  await seedUsers();

  // Assign orphan gifts
  await assignOrphanGifts();

  // Auto-save for SQLite (safety fallback)
  if (saveDB) {
    setInterval(saveDB, 30000);
  }
}

async function seedUsers() {
  const usersEnv = process.env.USERS || config.defaultUsers;
  if (!usersEnv) return;

  const userEntries = usersEnv.split(',').map(entry => entry.trim()).filter(Boolean);
  for (const entry of userEntries) {
    const parts = entry.split(':');
    if (parts.length < 3) {
      console.warn(`⚠️ Invalid user entry: ${entry} (expected slug:name:password[:emoji[:email]])`);
      continue;
    }
    const [slug, name, password, emoji, email] = parts;
    await User.seed({
      slug: slug.trim(),
      name: name.trim(),
      admin_password: password.trim(),
      avatar_emoji: emoji ? emoji.trim() : '🎁',
      email: email ? email.trim() : null
    });
    console.log(`👤 User "${name.trim()}" (/${slug.trim()}) ready`);
  }
}

async function assignOrphanGifts() {
  const users = await User.findAll();
  if (users.length === 0) return;

  const orphanCount = await Gift.assignOrphans(users[0].id);
  if (orphanCount > 0) {
    console.log(`📦 Assigned ${orphanCount} existing gift(s) to "${users[0].name}"`);
  }
}

// CORS
app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);
    if (config.allowedOrigins.includes('*')) return callback(null, true);
    if (config.allowedOrigins.indexOf(origin) === -1) {
      return callback(new Error('CORS policy: This origin is not allowed'), false);
    }
    return callback(null, true);
  },
  credentials: true
}));

if (!config.skipMorganInTest) {
  app.use(morgan('dev'));
}

app.use(express.json());
app.use(express.static('public'));

// Auth middleware on all routes
app.use(extractAuth);

// ==================== HELPER MIDDLEWARE ====================

function resolveUser(req, res, next) {
  (async () => {
    const user = await User.findBySlug(req.params.slug);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    req.wishlistUser = user;
    next();
  })().catch(next);
}

// ==================== AUTH ROUTES ====================

// Get auth config (SSO availability)
app.get('/api/auth/config', (req, res) => {
  res.json({
    sso: config.authentikEnabled,
    ssoUrl: config.authentikEnabled ? config.authentikUrl : null
  });
});

// Login with password → JWT
app.post('/api/auth/login', adminAuthLimiter, async (req, res) => {
  try {
    const { slug, password } = req.body;
    if (!slug || !password) {
      return res.status(400).json({ error: 'slug and password required' });
    }

    const user = await User.findBySlug(slug);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = await User.verifyPassword(user, password);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = generateToken(user);
    res.json({ token, user: User.sanitizeUser(user) });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// SSO: redirect to Authentik authorization page
app.get('/api/auth/sso/redirect', (req, res) => {
  if (!config.authentikEnabled) {
    return res.status(404).json({ error: 'SSO not enabled' });
  }
  const params = new URLSearchParams({
    client_id: config.authentikClientId,
    response_type: 'code',
    redirect_uri: `${config.appUrl}/api/auth/sso/callback`,
    scope: 'openid email profile',
  });
  // Support silent auth check (prompt=none)
  if (req.query.prompt === 'none') {
    params.set('prompt', 'none');
  }
  res.redirect(`${config.authentikUrl}/application/o/authorize/?${params}`);
});

// SSO: callback from Authentik with authorization code
app.get('/api/auth/sso/callback', async (req, res) => {
  try {
    const { code, error: authError } = req.query;
    // Silent auth failed (prompt=none, user not logged in) — just go home quietly
    if (authError || !code) {
      return res.redirect('/');
    }

    // Exchange code for tokens
    const tokenUrl = `${config.authentikUrl}/application/o/token/`;
    const fetch = (await import('node-fetch')).default;
    const tokenRes = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: `${config.appUrl}/api/auth/sso/callback`,
        client_id: config.authentikClientId,
        client_secret: config.authentikClientSecret,
      }),
    });

    if (!tokenRes.ok) {
      console.error('SSO token exchange failed:', await tokenRes.text());
      return res.redirect('/#/login-error?error=token_exchange');
    }

    const tokens = await tokenRes.json();

    // Get user info from Authentik
    const userInfoRes = await fetch(`${config.authentikUrl}/application/o/userinfo/`, {
      headers: { 'Authorization': `Bearer ${tokens.access_token}` },
    });

    if (!userInfoRes.ok) {
      return res.redirect('/#/login-error?error=userinfo');
    }

    const userInfo = await userInfoRes.json();
    const email = userInfo.email;

    if (!email) {
      return res.redirect('/#/login-error?error=no_email');
    }

    // Find wishlist user by email
    const user = await User.findByEmail(email);
    if (!user) {
      return res.redirect(`/#/login-error?error=no_account&email=${encodeURIComponent(email)}`);
    }

    // Generate our JWT and redirect to frontend with token + slug
    const jwt = generateToken(user);
    res.redirect(`/#/sso-complete?token=${jwt}&slug=${user.slug}`);
  } catch (error) {
    console.error('SSO callback error:', error);
    res.redirect('/#/login-error?error=server');
  }
});

// Get current auth state
app.get('/api/auth/me', async (req, res) => {
  if (!req.authUser) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  const user = await User.findById(req.authUser.id);
  if (!user) {
    return res.status(401).json({ error: 'User not found' });
  }
  res.json(User.sanitizeUser(user));
});

// ==================== HEALTH ====================

app.get('/health', async (req, res) => {
  const uptime = Math.floor((Date.now() - startTime) / 1000);
  try {
    const giftCount = await Gift.countAll();
    res.json({
      status: 'ok',
      uptime: `${uptime}s`,
      database: { connected: true, type: db.dialect, gifts: giftCount },
      timestamp: new Date().toISOString()
    });
  } catch {
    res.status(500).json({ status: 'error', error: 'Database connection failed' });
  }
});

// ==================== USER ROUTES ====================

// Update own profile (email, name, emoji)
app.put('/api/auth/profile', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.authUser.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const { email, name, avatar_emoji } = req.body;
    await User.updateProfile(user.id, {
      email: email !== undefined ? email : user.email,
      name: name !== undefined ? name : user.name,
      avatar_emoji: avatar_emoji !== undefined ? avatar_emoji : user.avatar_emoji
    });

    const updated = await User.findById(user.id);
    res.json(User.sanitizeUser(updated));
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Change own password
app.post('/api/auth/change-password', requireAuth, async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    if (!current_password || !new_password) {
      return res.status(400).json({ error: 'current_password and new_password required' });
    }
    if (new_password.length < 3) {
      return res.status(400).json({ error: 'Password must be at least 3 characters' });
    }

    const user = await User.findById(req.authUser.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const valid = await User.verifyPassword(user, current_password);
    if (!valid) {
      return res.status(403).json({ error: 'Current password is incorrect' });
    }

    await User.changePassword(user.id, new_password);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/users', async (req, res) => {
  const users = (await User.findAll()).map(u => User.sanitizeUser(u));
  res.json(users);
});

app.get('/api/users/:slug', resolveUser, (req, res) => {
  res.json(User.sanitizeUser(req.wishlistUser));
});

// ==================== CATEGORY & PRIORITY ROUTES ====================

app.get('/api/categories', async (req, res) => {
  const locale = req.query.locale || 'ru';
  const categories = await Category.findAll(locale);
  res.json(categories);
});

app.post('/api/categories', requireAuth, async (req, res) => {
  try {
    const category = await Category.create(req.body);
    res.json(category);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.put('/api/categories/:code', requireAuth, async (req, res) => {
  const existing = await Category.findByCode(req.params.code);
  if (!existing) return res.status(404).json({ error: 'Category not found' });
  const updated = await Category.update(req.params.code, req.body);
  res.json(updated);
});

app.delete('/api/categories/:code', requireAuth, async (req, res) => {
  await Category.delete(req.params.code);
  res.status(204).send();
});

app.get('/api/priorities', async (req, res) => {
  const locale = req.query.locale || 'ru';
  const priorities = await Priority.findAll(locale);
  res.json(priorities);
});

app.post('/api/priorities', requireAuth, async (req, res) => {
  try {
    const priority = await Priority.create(req.body);
    res.json(priority);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.put('/api/priorities/:code', requireAuth, async (req, res) => {
  const existing = await Priority.findByCode(req.params.code);
  if (!existing) return res.status(404).json({ error: 'Priority not found' });
  const updated = await Priority.update(req.params.code, req.body);
  res.json(updated);
});

app.delete('/api/priorities/:code', requireAuth, async (req, res) => {
  await Priority.delete(req.params.code);
  res.status(204).send();
});

// ==================== TRANSLATE ====================

app.post('/api/translate', requireAuth, async (req, res) => {
  try {
    const { text, from, to } = req.body;
    if (!text || !from || !to || !Array.isArray(to)) {
      return res.status(400).json({ error: 'text, from, and to[] are required' });
    }
    const result = await translateText(text, from, to);
    res.json(result);
  } catch (error) {
    console.error('Translation error:', error);
    res.status(500).json({ error: 'Translation failed' });
  }
});

// ==================== USER-SCOPED GIFT ROUTES ====================

app.get('/api/users/:slug/gifts', resolveUser, async (req, res) => {
  const gifts = (await Gift.findAll(req.wishlistUser.id)).map(g => Gift.sanitizeGift(g));
  res.json(gifts);
});

app.get('/api/users/:slug/gifts/:id', resolveUser, validateGiftId, async (req, res) => {
  const gift = await Gift.findById(parseInt(req.params.id));
  if (!gift || gift.user_id !== req.wishlistUser.id) {
    return res.status(404).json({ error: 'Not found' });
  }
  res.json(Gift.sanitizeGift(gift));
});

app.post('/api/users/:slug/gifts', resolveUser, requireOwner, validateGiftCreate, async (req, res) => {
  const gift = await Gift.create({ ...req.body, user_id: req.wishlistUser.id });
  res.json(Gift.sanitizeGift(gift));
});

app.put('/api/users/:slug/gifts/:id', resolveUser, requireOwner, validateGiftUpdate, async (req, res) => {
  const id = parseInt(req.params.id);
  const gift = await Gift.findById(id);
  if (!gift || gift.user_id !== req.wishlistUser.id) {
    return res.status(404).json({ error: 'Not found' });
  }
  const updated = await Gift.update(id, req.body);
  res.json(Gift.sanitizeGift(updated));
});

app.delete('/api/users/:slug/gifts/:id', resolveUser, requireOwner, async (req, res) => {
  const id = parseInt(req.params.id);
  const gift = await Gift.findById(id);
  if (!gift || gift.user_id !== req.wishlistUser.id) {
    return res.status(404).json({ error: 'Not found' });
  }
  await Gift.delete(id);
  res.status(204).send();
});

app.post('/api/users/:slug/gifts/:id/reserve', reservationLimiter, resolveUser, validateReserve, async (req, res) => {
  const { secret_code, reserved_by } = req.body;
  const id = parseInt(req.params.id);

  const gift = await Gift.findById(id);
  if (!gift || gift.user_id !== req.wishlistUser.id) {
    return res.status(404).json({ error: 'Not found' });
  }
  if (gift.reserved) return res.status(400).json({ error: 'Already reserved' });

  const updated = await Gift.reserve(id, secret_code, reserved_by);
  res.json(Gift.sanitizeGift(updated));
});

app.post('/api/users/:slug/gifts/:id/unreserve', reservationLimiter, resolveUser, validateUnreserve, async (req, res) => {
  const { secret_code } = req.body;
  const id = parseInt(req.params.id);

  const gift = await Gift.findById(id);
  if (!gift || gift.user_id !== req.wishlistUser.id) {
    return res.status(404).json({ error: 'Not found' });
  }
  if (!gift.reserved) return res.status(400).json({ error: 'Not reserved' });
  if (gift.secret_code !== secret_code) return res.status(403).json({ error: 'Unauthorized' });

  const updated = await Gift.unreserve(id);
  res.json(Gift.sanitizeGift(updated));
});

app.post('/api/users/:slug/gifts/:id/purchased', reservationLimiter, resolveUser, validatePurchased, async (req, res) => {
  const { secret_code } = req.body;
  const id = parseInt(req.params.id);

  const gift = await Gift.findById(id);
  if (!gift || gift.user_id !== req.wishlistUser.id) {
    return res.status(404).json({ error: 'Not found' });
  }
  if (!gift.reserved) return res.status(400).json({ error: 'Not reserved' });
  if (gift.secret_code !== secret_code) return res.status(403).json({ error: 'Unauthorized' });

  const updated = await Gift.markPurchased(id);
  res.json(Gift.sanitizeGift(updated));
});

app.post('/api/users/:slug/gifts/:id/gifted', resolveUser, requireOwner, async (req, res) => {
  const id = parseInt(req.params.id);

  const gift = await Gift.findById(id);
  if (!gift || gift.user_id !== req.wishlistUser.id) {
    return res.status(404).json({ error: 'Not found' });
  }
  if (gift.status === 'gifted') return res.status(400).json({ error: 'Already gifted' });

  const updated = await Gift.markGifted(id);
  res.json(Gift.sanitizeGift(updated));
});

// ==================== METADATA & AI ====================

app.post('/api/extract-metadata', async (req, res) => {
  const { url } = req.body;
  if (!url || !url.trim()) {
    return res.status(400).json({ error: 'URL is required' });
  }
  try {
    new URL(url);
  } catch {
    return res.status(400).json({ error: 'Invalid URL' });
  }
  try {
    const metadata = await extractMetadata(url);
    res.json(metadata);
  } catch (error) {
    console.error('Metadata extraction error:', error);
    res.status(500).json({ error: 'Failed to extract metadata' });
  }
});

app.post('/api/parse-gift', async (req, res) => {
  const { text, locale = 'ru' } = req.body;

  if (!text || text.trim().length === 0) {
    return res.status(400).json({ error: 'Text is required' });
  }
  if (!config.geminiApiKey) {
    return res.status(500).json({ error: 'Gemini API key not configured' });
  }

  try {
    // Check if text is a URL and extract metadata
    let metadata = {};
    let isUrl = false;
    try {
      new URL(text.trim());
      isUrl = true;
      try {
        metadata = await extractMetadata(text.trim());
      } catch {
        console.log('Could not extract metadata, continuing with AI only');
      }
    } catch {
      // Not a URL
    }

    // Build category list dynamically from DB
    const categories = await Category.findAll(locale);
    const priorities = await Priority.findAll(locale);
    const categoryList = categories.map(c => c.code).join(', ');
    const priorityList = priorities.map(p => `${p.code} (${p.emoji} ${p.name})`).join(', ');

    let inputText = text;
    if (isUrl && metadata.title) {
      inputText = `URL: ${text}\n\nPage Info:\nTitle: ${metadata.title}\nDescription: ${metadata.description || 'N/A'}\nImage: ${metadata.image || 'N/A'}`;
    }

    const languageMap = { ru: 'Russian', en: 'English', sr: 'Serbian' };
    const descriptionLanguage = languageMap[locale] || 'Russian';

    const genAI = new GoogleGenerativeAI(config.geminiApiKey);
    const model = genAI.getGenerativeModel({ model: config.geminiModel });

    const prompt = `Extract gift information from the following text or link and GENERATE a personal, practical description in ${descriptionLanguage}. Return ONLY valid JSON without any additional text or formatting.

Available categories: ${categoryList}
Available priorities: ${priorityList}

Text/Link: ${inputText}

${isUrl && metadata.image ? `IMPORTANT: The image URL "${metadata.image}" was found on the page. Include it in the image_url field.` : ''}

Return JSON in this exact format:
{
  "name": "gift name",
  "description": "personal explanation of why someone would want this",
  "price": "price with currency symbol or null",
  "category": "one of the available categories",
  "priority": "hot, medium, or low",
  "link": "product URL or null",
  "image_url": "product image URL or null"
}

Rules:
- ALWAYS generate a personal description in ${descriptionLanguage}
- Focus on WHY someone would want this
- Keep descriptions concise (1-2 sentences) but personal
- Default to medium priority if unclear
- Return null for missing optional fields
- Return ONLY JSON, no explanations`;

    const result = await model.generateContent(prompt);
    const response = result.response.text().trim();
    const cleanedResponse = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    let parsedData;
    try {
      parsedData = JSON.parse(cleanedResponse);
    } catch {
      return res.status(500).json({ error: 'Failed to parse AI response' });
    }

    const validCategories = categories.map(c => c.code);
    const validPriorities = priorities.map(p => p.code);

    if (!parsedData.name) {
      return res.status(500).json({ error: 'AI could not extract gift name' });
    }
    if (!validCategories.includes(parsedData.category)) {
      parsedData.category = validCategories[0] || 'electronics';
    }
    if (!validPriorities.includes(parsedData.priority)) {
      parsedData.priority = 'medium';
    }
    if (!parsedData.image_url && metadata.image) {
      parsedData.image_url = metadata.image;
    }

    res.json(parsedData);
  } catch (error) {
    console.error('Gemini API error:', error);
    res.status(500).json({ error: 'Failed to process gift with AI' });
  }
});

// ==================== ERROR HANDLING ====================

app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

app.use((err, req, res, _next) => {
  console.error('Error:', err);
  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: err.message });
  }
  if (err.message && err.message.includes('CORS')) {
    return res.status(403).json({ error: 'Origin not allowed' });
  }
  res.status(500).json({ error: 'Internal server error' });
});

// Static files & SPA fallback
if (process.env.NODE_ENV !== 'development') {
  app.use(express.static(path.join(__dirname, 'public')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });
}

// Start
initDB().then(() => {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`🎁 Wishlist app running on http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('Failed to initialize database:', err);
});
