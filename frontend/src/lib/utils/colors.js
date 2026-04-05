/**
 * Centralized Color Palette for Wishlist App
 *
 * All colors defined in one place for:
 * - Easy theming (light/dark)
 * - Type safety
 * - Consistency across components
 *
 * Usage:
 *   import { colors } from './utils/colors.js';
 *   class="{colors.text.primary}"
 */

export const colors = {
  // Primary brand colors
  primary: {
    DEFAULT: 'text-[#18181b]',
    dark: 'dark:text-white',
    bg: 'bg-[#18181b]',
    bgDark: 'dark:bg-white',
    hover: 'hover:bg-[#27272a]',
    hoverDark: 'dark:hover:bg-white/90',
    text: 'text-white',
    textDark: 'dark:text-graphite',
    border: 'border-black/10',
    borderDark: 'dark:border-white/20',
  },

  // Secondary actions (ghost buttons)
  secondary: {
    bg: 'bg-[#f4f4f5]',
    bgDark: 'dark:bg-white/10',
    hover: 'hover:bg-[#e4e4e7]',
    hoverDark: 'dark:hover:bg-white/15',
    text: 'text-[#3f3f46]',
    textDark: 'dark:text-white/70',
    border: 'border-black/10',
    borderDark: 'dark:border-white/10',
  },

  // Status colors
  status: {
    available: {
      text: 'text-emerald-700',
      textDark: 'dark:text-emerald-300',
      bg: 'bg-emerald-100',
      bgDark: 'dark:bg-emerald-900/30',
      border: 'border-emerald-200',
      borderDark: 'dark:border-emerald-800/50',
    },
    reserved: {
      text: 'text-amber-700',
      textDark: 'dark:text-amber-300',
      bg: 'bg-amber-100',
      bgDark: 'dark:bg-amber-900/30',
      border: 'border-amber-200',
      borderDark: 'dark:border-amber-800/50',
    },
    purchased: {
      text: 'text-blue-700',
      textDark: 'dark:text-blue-300',
      bg: 'bg-blue-100',
      bgDark: 'dark:bg-blue-900/30',
      border: 'border-blue-200',
      borderDark: 'dark:border-blue-800/50',
    },
    gifted: {
      text: 'text-violet-700',
      textDark: 'dark:text-violet-300',
      bg: 'bg-violet-100',
      bgDark: 'dark:bg-violet-900/30',
      border: 'border-violet-200',
      borderDark: 'dark:border-violet-800/50',
    },
  },

  // Priority colors
  priority: {
    hot: {
      text: 'text-red-800',
      textDark: 'dark:text-red-200',
      bg: 'bg-red-100',
      bgDark: 'dark:bg-red-900/20',
      border: 'border-red-200',
      borderDark: 'dark:border-red-800/30',
    },
    medium: {
      text: 'text-amber-800',
      textDark: 'dark:text-amber-200',
      bg: 'bg-amber-100',
      bgDark: 'dark:bg-amber-900/20',
      border: 'border-amber-200',
      borderDark: 'dark:border-amber-800/30',
    },
    low: {
      text: 'text-blue-800',
      textDark: 'dark:text-blue-200',
      bg: 'bg-blue-100',
      bgDark: 'dark:bg-blue-900/20',
      border: 'border-blue-200',
      borderDark: 'dark:border-blue-800/30',
    },
  },

  // Neutral colors
  neutral: {
    text: {
      DEFAULT: 'text-graphite',
      dark: 'dark:text-dark-text',
      muted: 'text-black/60',
      mutedDark: 'dark:text-white/60',
      inverse: 'text-white',
      inverseDark: 'dark:text-graphite',
    },
    background: {
      DEFAULT: 'bg-ivory',
      dark: 'dark:bg-dark-bg',
      surface: 'bg-surface',
      surfaceDark: 'dark:bg-surface-dark',
      surfaceHover: 'bg-surface-hover',
      surfaceHoverDark: 'dark:bg-surface-hover-dark',
    },
    border: {
      DEFAULT: 'border-black/[0.08]',
      dark: 'dark:border-white/[0.08]',
      hover: 'hover:border-black/20',
      hoverDark: 'dark:hover:border-white/20',
    },
  },

  // Shadow tokens
  shadow: {
    editorial: 'shadow-editorial',
    editorialLg: 'shadow-editorial-lg',
    raised: 'shadow-raised',
  },

  // Border radius tokens
  radius: {
    modal: 'rounded-modal', // 12px from app.css
    full: 'rounded-full',
    button: 'rounded-[4px]',
    card: 'rounded-[12px]',
  },

  // Spacing tokens
  spacing: {
    xs: 'px-3 py-1.5',
    sm: 'px-4 py-2',
    md: 'px-7 py-5',
    lg: 'px-10 py-6',
  },
};

/**
 * Get color classes for priority badge
 * @param {string} code - Priority code (hot, medium, low)
 * @returns {object} Color classes
 */
export function getPriorityColors(code) {
  return {
    bg: colors.priority[code]?.bg || colors.priority.medium.bg,
    text: colors.priority[code]?.text || colors.priority.medium.text,
    border: colors.priority[code]?.border || colors.priority.medium.border,
    // Add dark variants
    bgDark: colors.priority[code]?.bgDark || colors.priority.medium.bgDark,
    textDark: colors.priority[code]?.textDark || colors.priority.medium.textDark,
    borderDark: colors.priority[code]?.borderDark || colors.priority.medium.borderDark,
  };
}

/**
 * Get color classes for status badge
 * @param {string} status - Gift status (reserved, purchased)
 * @returns {object} Color classes
 */
export function getStatusColors(status) {
  return colors.status[status] || colors.status.available;
}
