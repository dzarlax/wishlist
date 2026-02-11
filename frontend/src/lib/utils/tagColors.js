/**
 * Centralized tag/priority color system
 * Now using unified color palette from colors.js
 *
 * Ensures consistent styling across all components
 */

import { colors } from './colors.js';

export { colors }; // Re-export for convenience

/**
 * Get priority color classes object
 * @param {string} code - Priority code (hot, medium, low)
 * @returns {object} Color classes
 */
export const getPriorityColors = (code) => {
  return colors.priority[code] || colors.priority.medium;
};

/**
 * Get status color classes object
 * @param {string} status - Gift status (reserved, purchased)
 * @returns {object} Color classes
 */
export const getStatusColors = (status) => {
  return colors.status[status] || colors.status.available;
};

/**
 * Get primary button color classes
 * @returns {object} Color classes
 */
export const getPrimaryButtonColors = () => {
  return colors.primary;
};

/**
 * Get secondary button color classes
 * @returns {object} Color classes
 */
export const getSecondaryButtonColors = () => {
  return colors.secondary;
};
