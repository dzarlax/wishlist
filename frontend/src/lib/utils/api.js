const ADMIN_PASSWORD_KEY = 'admin_password';

/**
 * Set the admin password for subsequent requests
 * Persists to localStorage for future sessions
 */
export function setAdminPassword(password) {
  localStorage.setItem(ADMIN_PASSWORD_KEY, password);
}

/**
 * Get the current admin password
 * Retrieves from localStorage if available
 */
export function getAdminPassword() {
  return localStorage.getItem(ADMIN_PASSWORD_KEY) || '';
}

/**
 * Clear the stored admin password
 * Removes from localStorage
 */
export function clearAdminPassword() {
  localStorage.removeItem(ADMIN_PASSWORD_KEY);
}

/**
 * Wrapper for API requests with automatic admin password handling
 */
export async function apiRequest(url, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  // Add admin password header if it's set and this is an admin operation
  const adminPassword = getAdminPassword();
  if (
    adminPassword &&
    (options.method === 'POST' || options.method === 'PUT' || options.method === 'DELETE')
  ) {
    // Check if this URL needs admin auth (not reserve/unreserve/purchased)
    const needsAdmin =
      !url.includes('/reserve') && !url.includes('/unreserve') && !url.includes('/purchased');
    if (needsAdmin) {
      headers['X-Admin-Password'] = adminPassword;
    }
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      // Return Russian error messages
      if (data.error) {
        throw new Error(data.error);
      }
      if (response.status === 403) {
        throw new Error('Неверный пароль администратора');
      }
      if (response.status === 404) {
        throw new Error('Подарок не найден');
      }
      if (response.status === 400) {
        throw new Error(data.error || 'Некорректные данные');
      }
      throw new Error('Произошла ошибка');
    }

    return data;
  } catch (error) {
    // Re-throw with custom message
    if (error.message.includes('Failed to fetch')) {
      throw new Error('Ошибка соединения с сервером');
    }
    throw error;
  }
}

/**
 * Convenience method for GET requests
 */
export async function get(url) {
  return apiRequest(url, { method: 'GET' });
}

/**
 * Convenience method for POST requests
 */
export async function post(url, body) {
  return apiRequest(url, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/**
 * Convenience method for PUT requests
 */
export async function put(url, body) {
  return apiRequest(url, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

/**
 * Convenience method for DELETE requests
 */
export async function del(url) {
  return apiRequest(url, { method: 'DELETE' });
}

/**
 * Parse gift information from text/link using AI
 */
export async function parseGift(text) {
  return post('/api/parse-gift', { text });
}
