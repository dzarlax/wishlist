# 🎁 Wishlist App

A modern wishlist application built with **Svelte + Vite + Tailwind CSS**.

Minimalist design, dark/light theme support, multi-language interface (Russian, English, Serbian), and anonymous gift reservations.

## ✨ Features

- ➕ Add gifts with category, priority, description, price, and link
- 🤖 **AI-powered autofill**: Paste a link or describe a gift — AI extracts name, price, category, priority, and image
- 🏷️ **Categories**: Electronics, Smart Home, Accessories, Education, and more
- ⭐ **Priorities**: Really want, Would be nice, Just a dream
- 🔒 **Anonymous reservation** with secret codes from gift givers
- ✅ **Statuses**: Available → Reserved → Purchased
- 🖼️ Image support (auto-extracted from product URLs via Open Graph metadata)
- 🗑️ Delete gifts
- 📱 Fully responsive design
- 💾 SQLite storage (all data in `wishlist.db`)
- 🎨 **Svelte + Tailwind CSS 4** — modern reactive UI
- 🌙 **Theme toggle** (light/dark) with preference persistence
- 🔔 **Toast notifications** for user feedback
- 🌍 **Multi-language support**: Russian, English, Serbian
- 🔐 **Persistent admin authentication** (saved in browser, no need to re-enter password)

## 🚀 Installation

### Requirements
- Node.js (v20 or higher)

### Quick Start

```bash
# 1. Install root dependencies
npm install

# 2. Install frontend dependencies
cd frontend && npm install && cd ..

# 3. Configure environment variables
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY

# 4. Run in development mode (backend + frontend)
npm run dev
```

The app will be available at:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000

**Important**: To use AI-powered gift autofill, get a free Gemini API key at https://makersuite.google.com/app/apikey and add it to your `.env` file:
```bash
GEMINI_API_KEY=your_api_key_here
```

### Production

```bash
# Build frontend
npm run build

# Start server (will serve static files from frontend/dist/)
npm start
```

### 🔒 Admin Password

**Default:** `wishlist2025`

**How to change password:**

Method 1 - Via .env file (recommended):
```bash
# Edit .env file
ADMIN_PASSWORD=your_secure_password
npm start
```

Method 2 - Via environment variable:
```bash
ADMIN_PASSWORD="your_password" npm start
```

**Password is required for:**
- ➕ Adding gifts
- ✏️ Editing gifts
- 🗑️ Deleting gifts
- 🤖 Using AI autofill

**Note**: The admin password is saved in your browser's localStorage, so you only need to enter it once per session.

## 🌍 Languages

The app supports three languages:
- 🇷🇺 **Russian** (default)
- 🇬🇧 **English**
- 🇷🇸 **Serbian**

Language preference is saved in localStorage and persists across sessions. The app automatically detects browser language on first visit.

## 🛠️ Tech Stack

### Frontend
- **Svelte 5** — reactive framework with excellent performance
- **Vite 7** — lightning-fast build tool
- **Tailwind CSS 4** — utility-first CSS with dark theme
- **Vitest** — unit testing

### Backend
- **Express.js** — REST API
- **sql.js** — SQLite in pure JavaScript (no native compilation)
- **Google Generative AI (Gemini)** — AI-powered gift parsing from natural language or URLs
- **cheerio** — Open Graph metadata extraction from product pages
- **node-fetch** — HTTP client for metadata extraction
- **dotenv** — environment variables
- **express-rate-limit** — rate limiting protection

## 📂 Project Structure

```
wishlist/
├── server.js              # Express + sql.js backend
├── server/                # Modular backend structure
│   ├── config/
│   │   └── env.js        # Environment configuration (CORS, etc.)
│   ├── middleware/
│   │   ├── rateLimiter.js    # Rate limiting
│   │   └── validation.js     # Request validation
│   ├── models/
│   │   └── Gift.js       # Gift model
│   └── migrations/
│       ├── migrationManager.js  # Migration system
│       ├── 0001-initial-schema.js
│       ├── 0002-add-category-codes.js
│       ├── 0003-add-priority-codes.js
│       └── 0004-cleanup-schema.js
├── package.json           # Root dependencies and scripts
├── .env                   # Environment variables
├── wishlist.db            # SQLite database
├── Dockerfile             # Docker configuration
├── docker-compose.yml     # Docker Compose configuration
├── frontend/              # Svelte application
│   ├── src/
│   │   ├── App.svelte              # Main component
│   │   ├── app.css                # Global styles with Tailwind
│   │   └── lib/
│   │       ├── GiftCard.svelte     # Gift card component
│   │       ├── PasswordModal.svelte # Admin authentication modal
│   │       ├── AddGiftModal.svelte # Add gift modal with AI autofill
│   │       ├── EditGiftModal.svelte # Edit gift modal
│   │       ├── ReserveModal.svelte # Reserve modal
│   │       ├── DeleteModal.svelte  # Delete modal
│   │       ├── components/         # Reusable components
│   │       │   ├── Toast.svelte
│   │       │   ├── ToastContainer.svelte
│   │       │   └── LanguageSwitcher.svelte
│   │       ├── stores/             # Svelte stores
│   │       │   ├── theme.js        # Theme management
│   │       │   ├── locale.js       # Locale management
│   │       │   └── toasts.js       # Toast notifications
│   │       ├── locales/            # Translations
│   │       │   ├── ru.json         # Russian
│   │       │   ├── en.json         # English
│   │       │   ├── sr.json         # Serbian
│   │       │   └── index.js
│   │       └── utils/              # Utilities
│   │           ├── api.js          # API client
│   │           ├── validation.js   # Form validation
│   │           └── i18n.js         # i18n utilities
│   ├── tests/               # Unit tests (Vitest)
│   ├── package.json
│   ├── vite.config.js       # Vite config + proxy
│   ├── tailwind.config.js   # Tailwind config
│   ├── postcss.config.js    # PostCSS config
│   ├── vitest.config.js     # Vitest config
│   └── svelte.config.js
├── CLAUDE.md             # Documentation for Claude Code
└── README.md
```

## 🎨 Design

- 🌙 **Theme toggle** (light/dark) with automatic system preference detection
- ⚡ **Minimalist interface** without unnecessary effects
- 💫 **Smooth transitions** and hover effects
- 📱 **Responsive design** for all devices
- 🎨 **Centralized design system** with tokens for colors, typography, spacing
- ♿ **Accessible**: Proper ARIA labels, keyboard navigation, semantic HTML

### Design System Architecture

**Color Palette:**
- Primary brand colors with light/dark variants
- Semantic colors: available (emerald), reserved (amber), purchased (emerald)
- Priority colors: hot (red), medium (amber), low (blue)
- Neutral grays for text, borders, backgrounds

**Typography Scale:**
- Sizes: xs (12px) → 4xl (36px)
- Weights: normal, medium, semibold, bold
- Tracking: normal, tight, tighter, widest
- Predefined combinations for common elements (labels, buttons, modals)

**Tokens:**
- Spacing: input, modal, xs, sm, md, lg, xl
- Shadows: editorial, editorial-lg, raised
- Radius: modal (12px), button (4px), card (12px)

## 🎭 How Anonymity Works

1. Gift giver reserves a gift and enters a **secret code**
2. This code is saved in the database but **not displayed** in the UI
3. Wishlist owner promises not to look at the database before the holiday
4. Gift giver can cancel or change status only knowing the code
5. After the holiday, the owner can see who gave what (if they want)

## 🔄 Data Import

The database is created automatically on first run through the migration system.

Initialization includes:
- Creating the `gifts` table with all necessary fields
- Adding category and priority codes for better i18n support
- Ready to work with categories and priorities

## 🔧 API

### GET /api/gifts
Get all gifts (sorted by priority)

### GET /api/gifts/:id
Get information about a specific gift

### POST /api/gifts
Add a new gift
```json
{
  "admin_password": "wishlist2025",
  "name": "Gift Name",
  "description": "Description",
  "category_code": "electronics",
  "priority_code": "hot",
  "link": "https://...",
  "image_url": "https://...",
  "price": "1000 ₽ + доставка"
}
```

**Category codes:** `electronics`, `home`, `accessories`, `education`, `games`, `clothing`, `sports`, `creativity`

**Priority codes:** `hot`, `medium`, `low`

### POST /api/gifts/:id/reserve
Reserve a gift
```json
{
  "secret_code": "SantaHelper123",
  "reserved_by": "Gift Giver"
}
```

### POST /api/gifts/:id/unreserve
Cancel reservation
```json
{
  "secret_code": "SantaHelper123"
}
```

### POST /api/gifts/:id/purchased
Mark as purchased
```json
{
  "secret_code": "SantaHelper123"
}
```

### PUT /api/gifts/:id
Edit a gift
```json
{
  "admin_password": "wishlist2025",
  "name": "New Name",
  "description": "New Description",
  "category_code": "electronics",
  "priority_code": "medium",
  "link": "https://...",
  "image_url": "https://...",
  "price": "$100 + shipping"
}
```

### DELETE /api/gifts/:id
Delete a gift
```json
{
  "admin_password": "wishlist2025"
}
```

### POST /api/parse-gift
Parse gift information from text or URL using AI
```json
{
  "text": "iPhone 15 Pro 256GB"
}
```

**Response:**
```json
{
  "name": "iPhone 15 Pro 256GB",
  "description": null,
  "price": null,
  "category": "electronics",
  "priority": "hot",
  "link": null,
  "image_url": null
}
```

**Supported inputs:**
- Natural language: "Хочу iPhone 15 Pro", "I really want a PS5"
- Product URLs: Automatically extracts name, price, image via Open Graph metadata
- Category detection: Auto-detects from keywords (laptop → electronics, book → education)
- Priority detection: Analyzes phrases like "very want" → hot, "would be nice" → medium

### POST /api/extract-metadata
Extract Open Graph metadata from a URL
```json
{
  "url": "https://example.com/product"
}
```

**Response:**
```json
{
  "title": "Product Name",
  "description": "Product description",
  "image": "https://example.com/image.jpg",
  "url": "https://example.com/product"
}
```

## 🔒 CORS Configuration

### Development
Allows localhost origins only (ports 5173, 5174, 5175, 5176, 3000)

### Production
By default, allows all origins (`*`) since frontend and backend are served from the same origin.

**To restrict access:**

Via `.env` file:
```bash
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

Via Docker:
```bash
docker run -d \
  -e ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com \
  -p 3000:3000 \
  wishlist-app
```

Via docker-compose:
```yaml
environment:
  - ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

## 🐳 Docker

### Using pre-built image (recommended)
```bash
# With docker-compose (uses image from Docker Hub)
docker-compose up -d

# Or manually
docker run -d \
  --name wishlist \
  -p 3000:3000 \
  -v $(pwd)/wishlist.db:/app/wishlist.db \
  -e ADMIN_PASSWORD="your_password" \
  -e ALLOWED_ORIGINS="https://yourdomain.com" \
  dzarlax/wishlist-app:latest
```

### Local build
```bash
# Local build with docker-compose
docker-compose -f docker-compose.dev.yml up -d

# Or build manually
docker build -t wishlist-app .

# Run local image
docker run -d \
  --name wishlist \
  -p 3000:3000 \
  -v $(pwd)/wishlist.db:/app/wishlist.db \
  -e ADMIN_PASSWORD="your_password" \
  wishlist-app
```

## 💡 Tips

- **AI Autofill**: Paste any product link or describe a gift in plain language — AI will extract all details automatically
- **Image Extraction**: When pasting product URLs, the app automatically extracts images via Open Graph metadata
- **Persistent Authentication**: Enter admin password once per browser — it's saved in localStorage
- **Database**: Created automatically on first run, all data saved in `wishlist.db`
- **Gift Sorting**: By priority (🔥 > ⭐ > 💭), then by creation date
- **Price Format**: Stored as text — supports custom formats like "15000 ₽ + доставка", "$100 + shipping", etc.
- **Language Preference**: Auto-detected from browser, saved in localStorage
- **Keyboard Shortcuts**: Press ESC to close any modal, Enter to submit forms
- **Accessibility**: All modals support keyboard navigation and screen readers

## 📝 License

MIT
