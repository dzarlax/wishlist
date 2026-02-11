/**
 * Centralized Typography System for Wishlist App
 *
 * All font sizes, weights, and spacing in one place
 * Ensures consistent typography across components
 *
 * Usage:
 *   import { typography } from './utils/typography.js';
 *   class="{typography.size.base} {typography.weight.medium}"
 */

export const typography = {
  // Font sizes (using Tailwind scale)
  size: {
    xs: 'text-xs',        // 12px
    sm: 'text-sm',        // 14px
    base: 'text-base',     // 16px
    lg: 'text-lg',        // 18px
    xl: 'text-xl',        // 20px
    '2xl': 'text-2xl',      // 24px
    '3xl': 'text-3xl',      // 30px
    '4xl': 'text-4xl',      // 36px
  },

  // Font weights
  weight: {
    normal: 'font-normal',
    medium: 'font-medium',
    semibold: 'font-semibold',
    bold: 'font-bold',
  },

  // Letter spacing (tracking)
  tracking: {
    normal: 'tracking-normal',
    tight: 'tracking-tight',
    tighter: 'tracking-tighter',
    widest: 'tracking-widest',
  },

  // Line heights (leading)
  leading: {
    none: 'leading-none',
    tight: 'leading-tight',
    normal: 'leading-normal',
    relaxed: 'leading-relaxed',
    loose: 'leading-loose',
  },

  // Common typography combinations
  combinations: {
    // Category badges
    category: 'text-xs',

    // Priority badges
    priority: 'text-xs',

    // Card titles
    cardTitle: 'text-base',
    cardTitleLarge: 'text-xl',

    // Modal titles
    modalTitle: 'text-2xl',

    // Button text
    button: 'text-[13px]',
    buttonSm: 'text-xs',

    // Body text
    body: 'text-sm',
    bodySm: 'text-xs',

    // Labels
    label: 'text-xs font-semibold tracking-widest uppercase',
  },

  // Spacing for text elements
  spacing: {
    input: 'px-4 py-3',
    inputSm: 'px-3 py-2',
    button: 'px-4 py-2',
    buttonSm: 'px-3 py-1.5',
    modalPadding: 'px-7 py-5',
  },
};

/**
 * Get typography classes for a specific element type
 * @param {string} type - Element type from combinations
 * @returns {string} Typography classes
 */
export function getType(type) {
  return typography.combinations[type] || typography.size.base;
}

/**
 * Get size class
 * @param {string} size - Size key (xs, sm, base, lg, xl, 2xl, etc.)
 * @returns {string} Size class
 */
export function getSize(size) {
  return typography.size[size] || typography.size.base;
}

/**
 * Get weight class
 * @param {string} weight - Weight key (normal, medium, semibold, bold)
 * @returns {string} Weight class
 */
export function getWeight(weight) {
  return typography.weight[weight] || typography.weight.normal;
}

/**
 * Get tracking class
 * @param {string} tracking - Tracking key (normal, tight, tighter, widest)
 * @returns {string} Tracking class
 */
export function getTracking(tracking) {
  return typography.tracking[tracking] || typography.tracking.normal;
}
