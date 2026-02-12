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
- **AI**: Google Generative AI (Gemini) for natural language gift parsing
- **Web Scraping**: cheerio + node-fetch for Open Graph metadata extraction
- **Testing**: Vitest for unit tests
- **Deployment**: Docker multi-stage build
- **i18n**: Multi-language support (Russian, English, Serbian)

### Key Architectural Patterns

**Admin vs Anonymous Operations:**
- Gift CRUD operations (create/update/delete) require admin authentication via `X-Admin-Password` header
- Admin password is saved in browser localStorage (`localStorage` key: `admin_password`)
- First time accessing admin features: PasswordModal appears to authenticate
- Subsequent admin operations: Automatically use saved password from localStorage
- Reservation operations (reserve/unreserve/purchased) require `secret_code` (set by the person reserving)
- Admin password defaults to `wishlist2025`, configurable via `ADMIN_PASSWORD` env var

**AI-Powered Gift Parsing:**
- `POST /api/parse-gift` endpoint uses Gemini AI to extract gift information
- Accepts natural language text or URLs
- For URLs: Extracts Open Graph metadata first, then enhances with AI if needed
- Automatic category detection from keywords
- Automatic priority detection from sentiment phrases
- Image extraction from product URLs via meta tags

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
│   ├── PasswordModal.svelte - Admin authentication (saves password to localStorage)
│   ├── AddGiftModal.svelte - Create new gift with AI autofill section
│   ├── EditGiftModal.svelte - Update existing gift (uses saved password)
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
    ├── api.js - API client methods (CRUD operations, password management, parseGift)
    ├── validation.js - Form validation utilities
    └── i18n.js - Internationalization utilities (t, formatPrice, formatDate)
```

All modals use Svelte event dispatchers for parent communication.

**Password Management:**
- `getAdminPassword()` - Retrieves password from localStorage
- `setAdminPassword(password)` - Saves password to localStorage
- `clearAdminPassword()` - Removes password from localStorage
- `apiRequest()` - Automatically adds `X-Admin-Password` header for admin operations

### Backend Structure

```
server.js (main entry point)
├── config/
│   └── env.js - Environment configuration & validation (including CORS, Gemini API)
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

**API Endpoints:**
- `GET /api/gifts` - List all gifts
- `GET /api/gifts/:id` - Get single gift
- `POST /api/gifts` - Create gift (requires admin auth)
- `PUT /api/gifts/:id` - Update gift (requires admin auth)
- `DELETE /api/gifts/:id` - Delete gift (requires admin auth)
- `POST /api/gifts/:id/reserve` - Reserve gift
- `POST /api/gifts/:id/unreserve` - Cancel reservation
- `POST /api/gifts/:id/purchased` - Mark as purchased
- `POST /api/parse-gift` - AI-powered gift parsing
- `POST /api/extract-metadata` - Open Graph metadata extraction
- `GET /health` - Health check endpoint

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

### Design System

**Centralized Design Tokens (`lib/utils/design-system.js`):**
- Re-exports `colors` from `colors.js`
- Re-exports `typography` from `typography.js`
- Provides helper functions: `getPriorityColors()`, `getStatusColors()`
- Single `designSystem` object for common patterns

**Colors (`lib/utils/colors.js`):**

All colors support light/dark variants with consistent naming:
- `primary` - Brand colors (buttons, actions)
- `secondary` - Ghost buttons, secondary actions
- `status` - available/reserved/purchased states
- `priority` - hot/medium/low priority badges
- `neutral` - Text, backgrounds, borders

Each color object has: `text/textDark`, `bg/bgDark`, `border/borderDark`, `hover/hoverDark`

**Typography (`lib/utils/typography.js`):**
- `size` - xs, sm, base, lg, xl, 2xl, 3xl, 4xl
- `weight` - normal, medium, semibold, bold
- `tracking` - normal, tight, tighter, widest
- `leading` - none, tight, normal, relaxed, loose
- `combinations` - Predefined styles (label, button, modalTitle, etc.)
- `spacing` - Input/button padding presets

**Usage in Components:**
```svelte
<script>
  import { designSystem, getPriorityColors } from './lib/utils/design-system.js';
  // @ts-ignore
  import { colors, typography } from './lib/utils/design-system.js';
</script>

<!-- Typography -->
<h1 class="{designSystem.text['2xl']} {designSystem.text.weight.medium}">
  Title
</h1>

<!-- Colors -->
<div class="{designSystem.color.neutral.text.DEFAULT} {designSystem.color.neutral.text.dark}">
  Text
</div>

<!-- Priority badge -->
<span class="{getPriorityColors('hot').bg} {getPriorityColors('hot').text}">
  🔥 {$t('priorities.hot')}
</span>
```

**Theme Tokens (from app.css `@theme`):**
- Colors: `--color-ivory`, `--color-graphite`, `--color-dark-bg`, `--color-dark-text`
- Shadows: `--shadow-editorial`, `--shadow-editorial-lg`, `--shadow-raised`
- Spacing: `--spacing-input`, `--spacing-modal`, etc.
- Radius: `--radius-modal`, `--radius-btn-icon`
- Widths: `--width-modal`, `--width-modal-lg`

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
- No `aria-hidden` on backdrop containers (avoided accessibility conflict with focused dialogs)

**Authentication Flow:**
1. User clicks "+" to add gift
2. App checks if password exists in localStorage
3. If no password: Show PasswordModal
4. User enters password → Saved to localStorage
5. AddGiftModal opens
6. All subsequent admin operations use saved password
7. Password persists across browser sessions until explicitly cleared

**Gift Card:**
- Uses semantic `<article>` element instead of `<div>`
- All clickable areas have proper ARIA attributes: `role="button"`, `tabindex="0"`, `aria-label`
- Keyboard navigation support with Enter/Space key handlers
- Separate interactive areas: image, content, price (each dispatches 'view' event)

**Svelte Transitions:**
- Use `transition:scale={{ duration, start, easing }}` (note: no `end` or `opacity` params)
- Use `transition:fly` for directional animations
- Use `transition:fade` for opacity transitions

### Code Conventions

- Multi-language support: Use `$t()` for all UI text
- Emoji prefixes for visual hierarchy (🎁, +, 🔥, ⭐, 💭, 🤖)
- Color-coded status badges: green (available), yellow (reserved), blue (purchased)
- Grid layout responsive: 1 column mobile → 4 columns desktop
- **Toast Notifications**: Use `toasts.success()`, `toasts.error()`, `toasts.info()` for user feedback
- **API Calls**: Use utility functions from `lib/utils/api.js` instead of raw `fetch()`
- **Password Management**: Use `getAdminPassword()`, `setAdminPassword()`, don't hardcode passwords
- **AI Parsing**: Use `parseGift(text)` for AI-powered gift extraction
- **Form Validation**: Use validation utilities from `lib/utils/validation.js`
- **Reactive Translations**: Use reactive statements (`$:`) for translations that need to update on locale change
- **Price as Text**: Always store and display prices as text (supports custom formats like "+ delivery")
- **CSS Vendor Prefixes**: When using webkit-specific properties, also include standard properties (e.g., `-webkit-line-clamp` + `line-clamp`)

### TypeScript Configuration

**frontend/tsconfig.json:**
- `noEmit: true` - TypeScript only for type checking, Vite handles compilation
- `checkJs: true` - Type checking for .js files
- No `extends` - Standalone config for Svelte + Vite (not SvelteKit)
- `types: ["vite/client", "svelte"]` - Vite and Svelte type definitions

**Note:** VS Code CSS validation is disabled in `.vscode/settings.json` due to Tailwind v4's `@variant` and `@theme` at-rules not being recognized by the CSS language server.

### Environment Variables

**Required for production:**
- `ADMIN_PASSWORD` - Admin password for gift CRUD operations
- `GEMINI_API_KEY` - Google Gemini API key for AI gift parsing
- `PORT` - Server port (default: 3000)

**Optional:**
- `GEMINI_MODEL` - Gemini model to use (default: `gemini-1.5-flash`)
- `ALLOWED_ORIGINS` - Comma-separated list of allowed CORS origins
- `NODE_ENV` - Environment mode (`development` or `production`)

### AI Gift Parsing

**Supported Input Types:**
1. **Natural Language**: "Хочу iPhone 15 Pro 256GB", "I really want a PS5"
2. **Product URLs**: Automatically extracts metadata via Open Graph
3. **Mixed**: Both text and URL in same input

**Detection Logic:**
- **Category**: Keywords like "laptop", "phone" → electronics; "book" → education
- **Priority**:
  - `hot`: "очень хочу", "need", "must have", "хочу"
  - `medium`: "было бы здорово", "would be nice", "хотелось бы"
  - `low`: "мечта", "someday", "just thinking", "мечтаю"
- **Images**: Extracted from `<meta property="og:image">` tags for URLs
- **Price**: Detected from text or product page metadata

**Error Handling:**
- Invalid API key → Returns 500 error
- No name detected → Returns 500 error
- Invalid URL → Continues with AI-only parsing
- Network errors → Caught and returned as 500 error
