import { writable } from 'svelte/store';
import { defaultLocale, supportedLocales } from '../locales/index.js';

// Storage key
const STORAGE_KEY = 'locale';

// Check if we're in browser environment
const isBrowser = typeof window !== 'undefined';

// Create the locale store with initial value
function createLocaleStore() {
	const { subscribe, set, update } = writable(
		isBrowser ? localStorage.getItem(STORAGE_KEY) || getBrowserLocale() : defaultLocale
	);

	return {
		subscribe,
		set: (locale) => {
			if (supportedLocales.includes(locale)) {
				if (isBrowser) {
					localStorage.setItem(STORAGE_KEY, locale);
				}
				set(locale);
			} else {
				console.warn(`Locale "${locale}" is not supported`);
			}
		},
		toggle: () => {
			update((currentLocale) => {
				const currentIndex = supportedLocales.indexOf(currentLocale);
				const nextIndex = (currentIndex + 1) % supportedLocales.length;
				const newLocale = supportedLocales[nextIndex];

				if (isBrowser) {
					localStorage.setItem(STORAGE_KEY, newLocale);
				}

				return newLocale;
			});
		}
	};
}

// Detect browser locale
function getBrowserLocale() {
	if (!isBrowser) return defaultLocale;

	const browserLocale = navigator.language || navigator.userLanguage;
	const localeCode = browserLocale.split('-')[0]; // Get 'ru' from 'ru-RU'

	return supportedLocales.includes(localeCode) ? localeCode : defaultLocale;
}

export const locale = createLocaleStore();
