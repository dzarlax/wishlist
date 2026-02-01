// Admin password storage (in-memory, will reset on refresh)
let adminPassword = '';

/**
 * Set the admin password for subsequent requests
 */
export function setAdminPassword(password) {
  adminPassword = password;
}

/**
 * Get the current admin password
 */
export function getAdminPassword() {
  return adminPassword;
}

/**
 * Clear the stored admin password
 */
export function clearAdminPassword() {
  adminPassword = '';
}

/**
 * Wrapper for API requests with automatic admin password handling
 */
export async function apiRequest(url, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  // Add admin password header if it's set and this is an admin operation
  if (adminPassword && (options.method === 'POST' || options.method === 'PUT' || options.method === 'DELETE')) {
    // Check if this URL needs admin auth (not reserve/unreserve/purchased)
    const needsAdmin = !url.includes('/reserve') && !url.includes('/unreserve') && !url.includes('/purchased');
    if (needsAdmin) {
      headers['X-Admin-Password'] = adminPassword;
    }
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers
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
    body: JSON.stringify(body)
  });
}

/**
 * Convenience method for PUT requests
 */
export async function put(url, body) {
  return apiRequest(url, {
    method: 'PUT',
    body: JSON.stringify(body)
  });
}

/**
 * Convenience method for DELETE requests
 */
export async function del(url) {
  return apiRequest(url, { method: 'DELETE' });
}
