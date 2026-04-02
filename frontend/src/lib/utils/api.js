import { auth } from '../stores/auth.js';

/**
 * Wrapper for API requests with automatic JWT handling.
 */
export async function apiRequest(url, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  // Add Bearer token if authenticated
  const token = auth.getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, { ...options, headers });

    if (response.status === 204) return null;

    const data = await response.json();

    if (!response.ok) {
      if (response.status === 401) {
        // Token expired — logout and let UI handle re-auth
        auth.logout();
        throw new Error('Session expired');
      }
      throw new Error(data.error || `Request failed (${response.status})`);
    }

    return data;
  } catch (error) {
    if (error.message.includes('Failed to fetch')) {
      throw new Error('Server connection error');
    }
    throw error;
  }
}

export async function get(url) {
  return apiRequest(url, { method: 'GET' });
}

export async function post(url, body) {
  return apiRequest(url, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function put(url, body) {
  return apiRequest(url, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export async function del(url) {
  return apiRequest(url, { method: 'DELETE' });
}

// ==================== Gift API ====================

export async function fetchUsers() {
  return get('/api/users');
}

export async function fetchUserGifts(userSlug) {
  return get(`/api/users/${userSlug}/gifts`);
}

export async function createUserGift(userSlug, data) {
  return post(`/api/users/${userSlug}/gifts`, data);
}

export async function updateUserGift(userSlug, giftId, data) {
  return put(`/api/users/${userSlug}/gifts/${giftId}`, data);
}

export async function deleteUserGift(userSlug, giftId) {
  return del(`/api/users/${userSlug}/gifts/${giftId}`);
}

export async function reserveUserGift(userSlug, giftId, data) {
  return post(`/api/users/${userSlug}/gifts/${giftId}/reserve`, data);
}

export async function unreserveUserGift(userSlug, giftId, data) {
  return post(`/api/users/${userSlug}/gifts/${giftId}/unreserve`, data);
}

export async function purchaseUserGift(userSlug, giftId, data) {
  return post(`/api/users/${userSlug}/gifts/${giftId}/purchased`, data);
}

// ==================== Reference Data API ====================

export async function fetchCategories(locale = 'ru') {
  return get(`/api/categories?locale=${locale}`);
}

export async function fetchPriorities(locale = 'ru') {
  return get(`/api/priorities?locale=${locale}`);
}

export async function createCategory(data) {
  return post('/api/categories', data);
}

export async function updateCategory(code, data) {
  return put(`/api/categories/${code}`, data);
}

export async function deleteCategory(code) {
  return del(`/api/categories/${code}`);
}

export async function createPriority(data) {
  return post('/api/priorities', data);
}

export async function updatePriority(code, data) {
  return put(`/api/priorities/${code}`, data);
}

export async function deletePriority(code) {
  return del(`/api/priorities/${code}`);
}

// ==================== Profile API ====================

export async function updateProfile(data) {
  return put('/api/auth/profile', data);
}

export async function changePassword(currentPassword, newPassword) {
  return post('/api/auth/change-password', {
    current_password: currentPassword,
    new_password: newPassword
  });
}

// ==================== AI API ====================

export async function parseGift(text, locale = 'ru') {
  return post('/api/parse-gift', { text, locale });
}

export async function translateText(text, from, to) {
  return post('/api/translate', { text, from, to });
}
