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
- **i18n**: Multi-language support (Russian, English, Serbian)

### Key Architectural Patterns

**Admin vs Anonymous Operations:**
- Gift CRUD operations (create/update/delete) require `admin_password` in request body
- Reservation operations (reserve/unreserve/purchased) require `secret_code` (set by the person reserving)
- Admin password defaults to `wishlist2025`, configurable via `ADMIN_PASSWORD` env var

**Database Schema:**
The `gifts` table contains: `id`, `name`, `description`, `category`, `priority`, `link`, `image_url`, `price`, `reserved`, `secret_code`, `reserved_by`, `reserved_at`, `status`, `created_at`.

Priority codes: `hot` (🔥 Очень хочу) > `medium` (⭐ Было бы здорово) > `low` (💭 Просто мечта)

Category codes: `electronics`, `home`, `accessories`, `education`, `games`, `clothing`, `sports`, `creativity`

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
│       ├── ToastContainer.svelte - Container for all toasts
│       └── LanguageSwitcher.svelte - Language selection dropdown
├── Stores:
│   ├── theme.js - Theme management with localStorage persistence
│   ├── locale.js - Locale/language management with localStorage persistence
│   └── toasts.js - Toast notification system
├── Locales:
│   ├── ru.json - Russian translations (default)
│   ├── en.json - English translations
│   ├── sr.json - Serbian translations
│   └── index.js - Translation loader and exports
└── Utils:
    ├── api.js - API client methods (CRUD operations)
    ├── validation.js - Form validation utilities
    └── i18n.js - Internationalization utilities (t, formatPrice, formatDate)
```

All modals use Svelte event dispatchers for parent communication.

### Backend Structure

```
server.js (main entry point)
├── config/
│   └── env.js - Environment configuration & validation (including CORS)
├── middleware/
│   ├── rateLimiter.js - Rate limiting for API endpoints
│   └── validation.js - Request validation middleware
├── models/
│   └── Gift.js - Gift model with database operations
└── migrations/
    ├── migrationManager.js - Database migration system
    ├── 0001-initial-schema.js - Initial schema migration
    ├── 0002-add-category-codes.js - Add category_code column
    ├── 0003-add-priority-codes.js - Add priority_code column
    └── 0004-cleanup-schema.js - Final schema cleanup
```

### Internationalization (i18n)

**Supported Languages:**
- Russian (`ru`) - default language
- English (`en`)
- Serbian (`sr`)

**Locale Store (`lib/stores/locale.js`):**
- Persists to `localStorage` key `locale`
- Detects browser language on first visit
- Automatically loads appropriate translations

**Translation Usage in Components:**
```svelte
<script>
  import { t } from './lib/utils/i18n.js';
</script>

<h1>{$t('app.title')}</h1>
<p>{$t('filters.resultsCount', { count: 5, total: 10 })}</p>
```

**Adding New Translations:**
1. Add keys to all locale files in `frontend/src/lib/locales/`
2. Use with `{$t('key.path')}` in components
3. For dynamic values, use interpolation: `{$t('key', { param: value })}`

**Price Formatting:**
- Prices are stored and displayed as plain text (not numbers)
- Supports custom formats: "15000 ₽", "$100", "5000 RUB + доставка"
- The `formatPrice` utility simply returns the price as-is

**Date Formatting:**
- Uses `Intl.DateTimeFormat` for locale-aware date formatting
- Format: `localeMap[$locale]` (ru-RU, en-US, sr-RS)

### CORS Configuration

**Development:** Allows localhost origins only (5173, 5174, 5175, 5176, 3000)

**Production:**
- Defaults to wildcard (`*`) if no `ALLOWED_ORIGINS` is set
- Can be restricted via environment variable:
  ```bash
  ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
  ```

**Docker:**
```yaml
environment:
  - ALLOWED_ORIGINS=https://mysite.com,https://app.mysite.com
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

### Accessibility

**Modal Components:**
- All modals have proper ARIA roles: `role="dialog"`, `aria-modal="true"`, `aria-labelledby`
- ESC key closes modals via `<svelte:window on:keydown />`
- All form labels have associated `for` attributes matching input `id`s
- Click outside closes modals

**Gift Card:**
- Uses semantic `<article>` element instead of `<div>`
- Proper ARIA attributes for interactive elements

### Code Conventions

- Multi-language support: Use `$t()` for all UI text
- Emoji prefixes for visual hierarchy (🎁, +, 🔥, ⭐, 💭)
- Color-coded status badges: green (available), yellow (reserved), blue (purchased)
- Grid layout responsive: 1 column mobile → 4 columns desktop
- **Toast Notifications**: Use `toasts.success()`, `toasts.error()`, `toasts.info()` for user feedback
- **API Calls**: Use utility functions from `lib/utils/api.js` instead of raw `fetch()`
- **Form Validation**: Use validation utilities from `lib/utils/validation.js`
- **Reactive Translations**: Use reactive statements (`$:`) for translations that need to update on locale change
- **Price as Text**: Always store and display prices as text (supports custom formats like "+ delivery")
