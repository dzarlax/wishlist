/**
 * Client-side validation utilities
 */

export const validators = {
  // Required field validation
  required: (value, fieldName = 'Поле') => {
    if (!value || !value.trim()) {
      return `${fieldName} обязательно`;
    }
    return null;
  },

  // Length validation
  minLength: (value, min, fieldName = 'Значение') => {
    if (value && value.length < min) {
      return `${fieldName} должно быть не менее ${min} символов`;
    }
    return null;
  },

  maxLength: (value, max, fieldName = 'Значение') => {
    if (value && value.length > max) {
      return `${fieldName} не может превышать ${max} символов`;
    }
    return null;
  },

  // URL validation
  url: (value, fieldName = 'Ссылка') => {
    if (value && value.trim()) {
      try {
        new URL(value);
      } catch {
        return `${fieldName} должна быть корректной`;
      }
    }
    return null;
  },

  // Email validation
  email: (value, fieldName = 'Email') => {
    if (value && value.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        return `${fieldName} должен быть корректным`;
      }
    }
    return null;
  },

  // Validate gift name
  giftName: (value) => {
    const requiredError = validators.required(value, 'Название');
    if (requiredError) return requiredError;

    const lengthError = validators.maxLength(value, 200, 'Название');
    if (lengthError) return lengthError;

    return null;
  },

  // Validate admin password
  adminPassword: (value) => {
    const requiredError = validators.required(value, 'Пароль администратора');
    if (requiredError) return requiredError;

    return null;
  },

  // Validate secret code
  secretCode: (value) => {
    const requiredError = validators.required(value, 'Секретный код');
    if (requiredError) return requiredError;

    const lengthError = validators.minLength(value, 3, 'Секретный код');
    if (lengthError) return lengthError;

    return null;
  },

  // Validate description (optional field with max length)
  description: (value) => {
    if (!value || !value.trim()) return null;
    return validators.maxLength(value, 1000, 'Описание');
  },

  // Validate price (optional field with max length)
  price: (value) => {
    if (!value || !value.trim()) return null;
    return validators.maxLength(value, 50, 'Цена');
  },

  // Validate link (optional field)
  link: (value) => {
    if (!value || !value.trim()) return null;
    const urlError = validators.url(value, 'Ссылка');
    if (urlError) return urlError;
    return validators.maxLength(value, 500, 'Ссылка');
  },

  // Validate image URL (optional field)
  imageUrl: (value) => {
    if (!value || !value.trim()) return null;
    const urlError = validators.url(value, 'Ссылка на изображение');
    if (urlError) return urlError;
    return validators.maxLength(value, 500, 'Ссылка');
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
