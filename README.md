# 🎁 Wishlist App

A modern wishlist application built with **Svelte + Vite + Tailwind CSS**.

Minimalist design, dark/light theme support, multi-language interface (Russian, English, Serbian), and anonymous gift reservations.

## ✨ Features

- ➕ Add gifts with category, priority, description, price, and link
- 🏷️ **Categories**: Electronics, Smart Home, Accessories, Education, and more
- ⭐ **Priorities**: Really want, Would be nice, Just a dream
- 🔒 **Anonymous reservation** with secret codes from gift givers
- ✅ **Statuses**: Available → Reserved → Purchased
- 🖼️ Image support (via URL)
- 🗑️ Delete gifts
- 📱 Fully responsive design
- 💾 SQLite storage (all data in `wishlist.db`)
- 🎨 **Svelte + Tailwind CSS 4** — modern reactive UI
- 🌙 **Theme toggle** (light/dark) with preference persistence
- 🔔 **Toast notifications** for user feedback
- 🌍 **Multi-language support**: Russian, English, Serbian

## 🚀 Installation

### Requirements
- Node.js (v20 or higher)

### Quick Start

```bash
# 1. Install root dependencies
npm install

# 2. Install frontend dependencies
cd frontend && npm install && cd ..

# 3. Run in development mode (backend + frontend)
npm run dev
```

The app will be available at:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000

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
│   │       ├── AddGiftModal.svelte # Add gift modal
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
- 🎨 **Slate palette** in Tailwind CSS 4
- ♿ **Accessible**: Proper ARIA labels, keyboard navigation, semantic HTML

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

- You can use product links for images
- Database is created automatically on first run
- All data is saved in `wishlist.db`
- Gifts are sorted by priority (🔥 > ⭐ > 💭)
- Prices are stored as text - supports custom formats like "15000 ₽ + доставка", "$100", etc.
- Language preference is saved automatically and persists across sessions
- Press ESC to close any modal
- All modals support keyboard navigation

## 📝 License

MIT
