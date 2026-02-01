# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Install all dependencies (root + frontend)
npm install && cd frontend && npm install && cd ..

# Development mode (runs both backend on :3000 and frontend on :5173)
npm run dev

# Backend only
npm run server

# Frontend only (from root)
npm run frontend

# Production build
npm run build
npm start
```

## Architecture Overview

This is a **full-stack application** with Svelte frontend and modular Express.js backend, using SQLite for data persistence.

### Technology Stack

- **Frontend**: Svelte 5 + Vite 7 + Tailwind CSS 4 (dark theme with slate palette)
- **Backend**: Express.js with sql.js (SQLite in pure JavaScript)
- **Database**: Single `gifts` table with in-memory SQLite + file persistence
- **Testing**: Vitest for unit tests
- **Deployment**: Docker multi-stage build

### Key Architectural Patterns

**Admin vs Anonymous Operations:**
- Gift CRUD operations (create/update/delete) require `admin_password` in request body
- Reservation operations (reserve/unreserve/purchased) require `secret_code` (set by the person reserving)
- Admin password defaults to `wishlist2025`, configurable via `ADMIN_PASSWORD` env var

**Database Schema:**
The `gifts` table contains: `id`, `name`, `description`, `category`, `priority`, `link`, `image_url`, `price`, `reserved`, `secret_code`, `reserved_by`, `reserved_at`, `status`, `created_at`.

Priority sorting order: `🔥 Очень хочу` > `⭐ Было бы здорово` > `💭 Просто мечта`

Status transitions: `available` → `reserved` → `purchased`

**API Proxying:**
- Development: Vite proxies `/api/*` to `http://localhost:3000`
- Production: Express serves static files from `frontend/dist/` and handles API routes

**Data Persistence:**
- sql.js uses in-memory database with 5-second auto-save interval to `wishlist.db`
- Custom `escapeString()` function prevents SQL injection (no prepared statements in sql.js)
- Migration system in `server/migrations/` for schema updates

### Frontend Structure

```
App.svelte (root, handles all state)
├── Components:
│   ├── GiftCard.svelte - Displays individual gift with status badges and actions
│   ├── AddGiftModal.svelte - Create new gift
│   ├── EditGiftModal.svelte - Update existing gift
│   ├── ReserveModal.svelte - Reserve with secret code creation
│   ├── DeleteModal.svelte - Confirmation dialog
│   └── components/
│       ├── Toast.svelte - Individual toast notification
│       └── ToastContainer.svelte - Container for all toasts
├── Stores:
│   ├── theme.js - Theme management with localStorage persistence
│   └── toasts.js - Toast notification system
└── Utils:
    ├── api.js - API client methods (CRUD operations)
    └── validation.js - Form validation utilities
```

All modals use Svelte event dispatchers for parent communication.

### Backend Structure

```
server.js (main entry point)
├── config/
│   └── env.js - Environment configuration & validation
├── middleware/
│   ├── rateLimiter.js - Rate limiting for API endpoints
│   └── validation.js - Request validation middleware
├── models/
│   └── Gift.js - Gift model with database operations
└── migrations/
    ├── migrationManager.js - Database migration system
    └── 0001-initial-schema.js - Initial schema migration
```

### Dark Mode

**Tailwind 4 Configuration:**
Dark mode is configured via CSS using `@variant` directive in `frontend/src/app.css`:

```css
@variant dark (&:where(.dark, .dark *));
```

This enables class-based dark mode where the `dark` class on `<html>` element activates `dark:` modifiers.

**Theme Store (`lib/stores/theme.js`):**
- Persists to `localStorage` key `theme`
- Values: `'dark'` or `'light'`
- Automatically applies/removes `dark` class on `document.documentElement`
- Falls back to system preference on first visit

**Usage in Components:**
```svelte
<div class="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
  <!-- Content -->
</div>
```

### Code Conventions

- UI text is in Russian (target audience)
- Emoji prefixes for visual hierarchy (🎁, +, 🔥, ⭐, 💭)
- Color-coded status badges: green (available), yellow (reserved), blue (purchased)
- Grid layout responsive: 1 column mobile → 4 columns desktop
- **Toast Notifications**: Use `toasts.success()`, `toasts.error()`, `toasts.info()` for user feedback
- **API Calls**: Use utility functions from `lib/utils/api.js` instead of raw `fetch()`
- **Form Validation**: Use validation utilities from `lib/utils/validation.js`