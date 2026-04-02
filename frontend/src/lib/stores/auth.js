import { writable, derived } from 'svelte/store';

const TOKEN_KEY = 'auth_token';
const isBrowser = typeof window !== 'undefined';

function createAuthStore() {
  const token = writable(isBrowser ? localStorage.getItem(TOKEN_KEY) : null);
  const user = writable(null);
  const loading = writable(true);
  const ssoConfig = writable({ sso: false, ssoUrl: null });

  const isAuthenticated = derived(
    [token, user],
    ([$token, $user]) => !!$token && !!$user
  );

  async function init() {
    loading.set(true);

    // Fetch SSO config
    try {
      const res = await fetch('/api/auth/config');
      if (res.ok) {
        ssoConfig.set(await res.json());
      }
    } catch {
      // ignore
    }

    // Check for SSO callback token in hash
    if (isBrowser) {
      const hash = window.location.hash;
      const ssoMatch = hash.match(/sso-complete\?token=([^&]+)(?:&slug=([^&]+))?/);
      if (ssoMatch) {
        const ssoToken = decodeURIComponent(ssoMatch[1]);
        const slug = ssoMatch[2] ? decodeURIComponent(ssoMatch[2]) : null;
        localStorage.setItem(TOKEN_KEY, ssoToken);
        token.set(ssoToken);
        // Navigate to user's wishlist or home
        window.location.hash = slug ? `#/${slug}` : '';
      }
    }

    // Validate existing token
    let currentToken;
    token.subscribe(v => currentToken = v)();

    if (currentToken) {
      try {
        const res = await fetch('/api/auth/me', {
          headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        if (res.ok) {
          user.set(await res.json());
        } else {
          logout();
        }
      } catch {
        logout();
      }
    } else {
      // No token — try silent SSO check (no redirects)
      let cfg;
      ssoConfig.subscribe(v => cfg = v)();
      if (cfg?.sso) {
        await trySilentSso();
      }
    }

    loading.set(false);
  }

  async function loginWithPassword(slug, password) {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug, password })
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Login failed');
    }

    const data = await res.json();
    setSession(data.token, data.user);
    return data.user;
  }

  async function loginWithSso() {
    const res = await fetch('/api/auth/sso', { method: 'POST' });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'SSO login failed');
    }
    const data = await res.json();
    setSession(data.token, data.user);
    return data.user;
  }

  function setSession(newToken, newUser) {
    if (isBrowser) {
      localStorage.setItem(TOKEN_KEY, newToken);
    }
    token.set(newToken);
    user.set(newUser);
  }

  function logout() {
    if (isBrowser) {
      localStorage.removeItem(TOKEN_KEY);
    }
    token.set(null);
    user.set(null);
  }

  /**
   * Try silent SSO via AJAX — no redirects, no flashing.
   * Calls /api/auth/sso/check which is behind Authentik ForwardAuth.
   * If user has Authentik session → returns JWT. If not → returns non-JSON.
   */
  async function trySilentSso() {
    if (!isBrowser) return;
    try {
      const res = await fetch('/api/auth/sso/check', {
        credentials: 'include',
        redirect: 'follow'
      });
      // If ForwardAuth redirected to Authentik login, response won't be JSON
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        if (data.token) {
          setSession(data.token, data.user);
        }
      }
    } catch {
      // CORS error or network issue — not logged in, stay as guest
    }
  }

  /**
   * Get the current token synchronously (for API calls).
   */
  function getToken() {
    let t;
    token.subscribe(v => t = v)();
    return t;
  }

  return {
    token: { subscribe: token.subscribe },
    user: { subscribe: user.subscribe },
    loading: { subscribe: loading.subscribe },
    ssoConfig: { subscribe: ssoConfig.subscribe },
    isAuthenticated,
    init,
    loginWithPassword,
    loginWithSso,
    logout,
    getToken
  };
}

export const auth = createAuthStore();
