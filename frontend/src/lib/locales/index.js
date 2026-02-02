// Translation loader
import ru from './ru.json';
import en from './en.json';
import sr from './sr.json';

export const translations = {
  ru,
  en,
  sr,
};

export const defaultLocale = 'ru';
export const supportedLocales = ['ru', 'en', 'sr'];

export async function getTranslation(locale) {
  if (!supportedLocales.includes(locale)) {
    console.warn(`Locale "${locale}" not supported, falling back to "${defaultLocale}"`);
    locale = defaultLocale;
  }

  return translations[locale];
}
