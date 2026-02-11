/**
 * Unified Design System for Wishlist App
 *
 * Centralizes all design tokens:
 * - Colors (colors.js)
 * - Typography (typography.js)
 * - Spacing, Shadows, Radius (from colors.js)
 *
 * Usage:
 *   import { colors, typography } from './lib/utils/design-system.js';
 */

import { colors } from './colors.js';
import { typography } from './typography.js';

// Re-export for convenience
export { colors, typography };

/**
 * Get priority color classes object
 * @param {string} code - Priority code (hot, medium, low)
 * @returns {object} Color classes
 */
export const getPriorityColors = (code) => colors.priority[code] || colors.priority.medium;

/**
 * Get status color classes object
 * @param {string} status - Gift status (reserved, purchased)
 * @returns {object} Color classes
 */
export const getStatusColors = (status) => colors.status[status] || colors.status.available;

/**
 * Get primary button color classes
 * @returns {object} Color classes
 */
export const getSecondaryButtonColors = () => colors.secondary;

/**
 * Design system shortcuts for common patterns
 */
export const designSystem = {
  // Typography shortcuts
  text: {
    // Sizes
    xs: typography.size.xs,
    sm: typography.size.sm,
    base: typography.size.base,
    lg: typography.size.lg,
    xl: typography.size.xl,
    '2xl': typography.size['2xl'],
    '3xl': typography.size['3xl'],
    '4xl': typography.size['4xl'],

    // Weights
    weight: typography.weight,

    // Tracking
    tracking: typography.tracking,

    // Leading (line-height)
    leading: typography.leading,

    // Combinations
    combinations: typography.combinations,

    // Spacing
    spacing: typography.spacing,
  },

  // Color shortcuts
  color: colors,

  // Common component styles
  button: {
    primary: colors.primary,
    secondary: colors.secondary,
  },

  badge: {
    category: `${typography.combinations.category} text-black/70 dark:text-white/70 bg-[var(--color-surface)] dark:bg-[var(--color-surface-dark)] border ${colors.neutral.border.DEFAULT} dark:border-white/[0.08]`,
    priority: typography.combinations.priority,
  },

  // Spacing tokens
  spacing: colors.spacing,

  // Shadow tokens
  shadow: colors.shadow,

  // Radius tokens
  radius: colors.radius,
};
