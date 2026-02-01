/**
 * Client-side validation utilities with i18n support
 */
import { translationsStore, getTranslation } from './i18n.js';

// Get validator error messages from translations
function getMessage(key, params = {}) {
	const translations = getTranslationFromStore();
	return getTranslation(translations, key, params);
}

// Helper to get current translations from store
function getTranslationFromStore() {
	let translations;
	const unsubscribe = translationsStore.subscribe(val => translations = val);
	unsubscribe();
	return translations;
}

export const validators = {
  // Required field validation
  required: (value, fieldName = 'validation.required') => {
    if (!value || !value.trim()) {
      return getMessage(fieldName);
    }
    return null;
  },

  // Length validation
  minLength: (value, min, fieldName = 'validation.required') => {
    if (value && value.length < min) {
      return getMessage('validation.nameRequired'); // Generic error for now
    }
    return null;
  },

  maxLength: (value, max, fieldName = 'validation.nameRequired') => {
    if (value && value.length > max) {
      return getMessage('validation.nameRequired'); // Generic error for now
    }
    return null;
  },

  // URL validation
  url: (value, fieldName = 'validation.invalidUrl') => {
    if (value && value.trim()) {
      try {
        new URL(value);
      } catch {
        return getMessage(fieldName);
      }
    }
    return null;
  },

  // Email validation
  email: (value, fieldName = 'validation.invalidUrl') => {
    if (value && value.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        return getMessage(fieldName);
      }
    }
    return null;
  },

  // Validate gift name
  giftName: (value) => {
    if (!value || !value.trim()) {
      return getMessage('validation.nameRequired');
    }
    const lengthError = validators.maxLength(value, 200);
    if (lengthError) return lengthError;
    return null;
  },

  // Validate admin password
  adminPassword: (value) => {
    if (!value || !value.trim()) {
      return getMessage('validation.adminPassword') + ' ' + getMessage('validation.required');
    }
    return null;
  },

  // Validate secret code
  secretCode: (value) => {
    if (!value || !value.trim()) {
      return getMessage('validation.secretCodeRequired');
    }
    const lengthError = validators.minLength(value, 3);
    if (lengthError) return lengthError;
    return null;
  },

  // Validate description (optional field with max length)
  description: (value) => {
    if (!value || !value.trim()) return null;
    return validators.maxLength(value, 1000);
  },

  // Validate price (optional field with max length)
  price: (value) => {
    if (!value || !value.trim()) return null;
    return validators.maxLength(value, 50);
  },

  // Validate link (optional field)
  link: (value) => {
    if (!value || !value.trim()) return null;
    const urlError = validators.url(value);
    if (urlError) return urlError;
    return validators.maxLength(value, 500);
  },

  // Validate image URL (optional field)
  imageUrl: (value) => {
    if (!value || !value.trim()) return null;
    const urlError = validators.url(value);
    if (urlError) return urlError;
    return validators.maxLength(value, 500);
  }
};

/**
 * Validate all fields in an object
 * @param {Object} fields - Object with field names and validators
 * @returns {Object} - Object with errors for each field
 */
export function validateFields(fields) {
  const errors = {};

  for (const [fieldName, validator] of Object.entries(fields)) {
    const error = validator();
    if (error) {
      errors[fieldName] = error;
    }
  }

  return errors;
}

/**
 * Check if there are any validation errors
 * @param {Object} errors - Object with field errors
 * @returns {boolean}
 */
export function hasErrors(errors) {
  return Object.keys(errors).length > 0;
}
