import { derived, writable } from 'svelte/store';
import { locale } from '../stores/locale.js';
import { translations, defaultLocale } from '../locales/index.js';

// Create a reactive store for current translations
function createTranslationsStore() {
	const { subscribe } = derived(locale, ($locale) => {
		return translations[$locale] || translations[defaultLocale];
	});

	return { subscribe };
}

export const translationsStore = createTranslationsStore();

/**
 * Get a translation by key with optional parameters
 * This is a non-reactive version - use $t from components for reactivity
 * @param {string} key - Dot-notation key (e.g., 'app.title')
 * @param {object} params - Parameters for interpolation
 * @returns {string} Translated string
 */
export function getTranslation(translationsObj, key, params = {}) {
	const keys = key.split('.');
	let value = translationsObj;

	for (const k of keys) {
		if (value && typeof value === 'object' && k in value) {
			value = value[k];
		} else {
			console.warn(`Translation key "${key}" not found`);
			return key;
		}
	}

	// Handle non-string values (numbers, booleans, etc.)
	if (typeof value !== 'string') {
		return value;
	}

	// Interpolate parameters
	return value.replace(/\{(\w+)\}/g, (match, param) => {
		return params[param] !== undefined ? params[param] : match;
	});
}

/**
 * Reactive translation function store
 * Usage in components: $t('app.title') or $t('filters.resultsCount', { count: 5 })
 */
export const t = derived(translationsStore, ($translations) => {
	return (key, params = {}) => getTranslation($translations, key, params);
});

/**
 * Get current locale code (non-reactive)
 * @returns {string} Current locale (e.g., 'ru', 'en')
 */
export function getCurrentLocale() {
	// This is a sync getter for the current locale value
	let current = defaultLocale;
	const unsub = locale.subscribe(val => current = val);
	unsub();
	return current;
}

/**
 * Format price - returns price as-is (supports custom text like "+ delivery" or custom currencies)
 * @param {string|number} price - Price value
 * @returns {string} Price text
 */
export const formatPrice = derived(locale, ($locale) => (price) => {
	if (!price) return '';
	return price;
});

/**
 * Format date according to locale
 * @param {string} dateString - ISO date string
 * @returns {string} Formatted date
 */
export const formatDate = derived(locale, ($locale) => (dateString) => {
	if (!dateString) return '';

	const date = new Date(dateString);
	if (isNaN(date.getTime())) return dateString;

	const localeMap = {
		ru: 'ru-RU',
		sr: 'sr-RS',
		en: 'en-US'
	};

	return new Intl.DateTimeFormat(localeMap[$locale] || 'en-US', {
		year: 'numeric',
		month: 'short',
		day: 'numeric'
	}).format(date);
});
