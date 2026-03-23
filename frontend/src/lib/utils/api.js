const ADMIN_PASSWORD_KEY = 'admin_password';

/**
 * Get the localStorage key for a user-specific admin password
 */
function getUserPasswordKey(userSlug) {
  return userSlug ? `admin_password_${userSlug}` : ADMIN_PASSWORD_KEY;
}

/**
 * Set the admin password for subsequent requests
 * Persists to localStorage for future sessions
 */
export function setAdminPassword(password, userSlug = null) {
  localStorage.setItem(getUserPasswordKey(userSlug), password);
}

/**
 * Get the current admin password
 * Retrieves from localStorage if available
 */
export function getAdminPassword(userSlug = null) {
  return localStorage.getItem(getUserPasswordKey(userSlug)) || '';
}

/**
 * Clear the stored admin password
 * Removes from localStorage
 */
export function clearAdminPassword(userSlug = null) {
  localStorage.removeItem(getUserPasswordKey(userSlug));
}

/**
 * Wrapper for API requests with automatic admin password handling
 */
export async function apiRequest(url, options = {}, userSlug = null) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  // Add admin password header if it's set and this is an admin operation
  const adminPassword = getAdminPassword(userSlug);
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

    // Handle 204 No Content (e.g., DELETE)
    if (response.status === 204) {
      return null;
    }

    const data = await response.json();

    if (!response.ok) {
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
export async function post(url, body, userSlug = null) {
  return apiRequest(url, {
    method: 'POST',
    body: JSON.stringify(body),
  }, userSlug);
}

/**
 * Convenience method for PUT requests
 */
export async function put(url, body, userSlug = null) {
  return apiRequest(url, {
    method: 'PUT',
    body: JSON.stringify(body),
  }, userSlug);
}

/**
 * Convenience method for DELETE requests
 */
export async function del(url, userSlug = null) {
  return apiRequest(url, { method: 'DELETE' }, userSlug);
}

/**
 * Parse gift information from text/link using AI
 */
export async function parseGift(text, locale = 'ru') {
  return post('/api/parse-gift', { text, locale });
}

// ==================== User API ====================

/**
 * Fetch all users
 */
export async function fetchUsers() {
  return get('/api/users');
}

/**
 * Fetch gifts for a specific user
 */
export async function fetchUserGifts(userSlug) {
  return get(`/api/users/${userSlug}/gifts`);
}

/**
 * Create a gift for a specific user
 */
export async function createUserGift(userSlug, data) {
  return post(`/api/users/${userSlug}/gifts`, data, userSlug);
}

/**
 * Update a gift for a specific user
 */
export async function updateUserGift(userSlug, giftId, data) {
  return put(`/api/users/${userSlug}/gifts/${giftId}`, data, userSlug);
}

/**
 * Delete a gift for a specific user
 */
export async function deleteUserGift(userSlug, giftId) {
  return del(`/api/users/${userSlug}/gifts/${giftId}`, userSlug);
}

/**
 * Reserve a gift for a specific user
 */
export async function reserveUserGift(userSlug, giftId, data) {
  return post(`/api/users/${userSlug}/gifts/${giftId}/reserve`, data);
}

/**
 * Unreserve a gift for a specific user
 */
export async function unreserveUserGift(userSlug, giftId, data) {
  return post(`/api/users/${userSlug}/gifts/${giftId}/unreserve`, data);
}

/**
 * Mark a gift as purchased for a specific user
 */
export async function purchaseUserGift(userSlug, giftId, data) {
  return post(`/api/users/${userSlug}/gifts/${giftId}/purchased`, data);
}

/**
 * Verify per-user admin password
 */
export async function verifyUserPassword(userSlug, password) {
  const response = await fetch(`/api/users/${userSlug}/verify-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Password': password,
    },
  });

  if (!response.ok) {
    throw new Error('Invalid password');
  }

  return response.json();
}
