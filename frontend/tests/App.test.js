import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fireEvent, render, waitFor } from '@testing-library/svelte';
import App from '../src/App.svelte';

const users = [
  { id: 1, slug: 'alexey', name: 'Alexey', avatar_emoji: '🎁', is_admin: true, can_use_ai: true },
];

const categories = [{ code: 'electronics', emoji: '🔧', name: 'Electronics', sort_order: 1 }];

const priorities = [{ code: 'medium', emoji: '⭐', name: 'Would be nice', sort_order: 2 }];

function jsonResponse(data, ok = true, status = 200) {
  return {
    ok,
    status,
    json: async () => data,
  };
}

function mockApi({ gifts = [], invite = null, loginUser = users[0], userList = users } = {}) {
  global.fetch = vi.fn(async (url) => {
    const path = String(url);
    if (path === '/api/auth/config') return jsonResponse({ sso: false });
    if (path === '/api/auth/login')
      return jsonResponse({
        token: 'test-token',
        user: loginUser,
      });
    if (path === '/api/users') return jsonResponse(userList);
    if (path === '/api/users/alexey/gifts') return jsonResponse(gifts);
    if (path.startsWith('/api/categories')) return jsonResponse(categories);
    if (path.startsWith('/api/priorities')) return jsonResponse(priorities);
    if (path === '/api/invites/test-token')
      return jsonResponse(
        invite || {
          email: null,
          name_hint: 'Invited User',
          can_use_ai: false,
          expires_at: new Date().toISOString(),
        }
      );
    return jsonResponse({ error: 'Not found' }, false, 404);
  });
}

describe('App', () => {
  beforeEach(() => {
    localStorage.clear();
    window.location.hash = '';
    mockApi();
  });

  it('renders the header', () => {
    const { container } = render(App);
    expect(container.querySelector('h1')?.textContent).toContain('Wishlist');
  });

  it('renders the private-link homepage without the wishlist directory', async () => {
    const { container } = render(App);

    await waitFor(() => {
      expect(container.textContent).toContain('Gifts without guessing or duplicates');
      expect(container.textContent).toContain('So gifting is easier');
      expect(container.textContent).toContain('Three steps from wish to celebration');
      expect(container.textContent).toContain('How to get access');
      expect(container.textContent).not.toContain('Whose wishlist?');
      expect(container.textContent).not.toContain('/alexey');
    });
  });

  it('opens root login with login field', async () => {
    const { container, getByRole } = render(App);

    await waitFor(() => {
      expect(container.textContent).toContain('How to get access');
    });

    await fireEvent.click(getByRole('button', { name: /^owner login$/i }));

    await waitFor(() => {
      expect(container.querySelector('#wishlist-address')).toBeTruthy();
      expect(container.querySelector('#auth-password')).toBeTruthy();
    });
  });

  it('opens the owner wishlist after root login when the users list is stale', async () => {
    mockApi({ userList: [], loginUser: users[0], gifts: [] });

    const { container, getByRole } = render(App);

    await waitFor(() => {
      expect(container.textContent).toContain('How to get access');
    });

    await fireEvent.click(getByRole('button', { name: /^owner login$/i }));
    await fireEvent.input(container.querySelector('#wishlist-address'), {
      target: { value: 'alexey' },
    });
    await fireEvent.input(container.querySelector('#auth-password'), {
      target: { value: 'wishlist2025' },
    });
    await fireEvent.click(getByRole('button', { name: /^login$/i }));

    await waitFor(() => {
      expect(window.location.hash).toBe('#/alexey');
      expect(container.textContent).toContain('No gifts');
      expect(container.textContent).toContain('Copy link');
    });
  });

  it('opens invite instructions from the root invite CTA', async () => {
    const { container, getByRole } = render(App);

    await waitFor(() => {
      expect(container.textContent).toContain('Get an invite');
    });

    await fireEvent.click(getByRole('button', { name: /^get an invite$/i }));

    await waitFor(() => {
      expect(container.textContent).toContain('How to get an invite');
      expect(container.textContent).toContain('I want my own wishlist');
      expect(container.querySelector('#auth-password')).toBeFalsy();
    });
  });

  it('shows loading state initially', () => {
    const { container } = render(App);
    expect(container.querySelector('.animate-spin')).toBeTruthy();
  });

  it('displays empty state when selected user has no gifts', async () => {
    window.location.hash = '#/alexey';
    mockApi({ gifts: [] });

    const { container } = render(App);

    await waitFor(() => {
      expect(container.textContent).toContain('No gifts');
      expect(container.textContent).toContain('Login');
    });
  });

  it('displays gifts when loaded for selected user', async () => {
    window.location.hash = '#/alexey';
    mockApi({
      gifts: [
        {
          id: 1,
          name: 'Test Gift',
          category_code: 'electronics',
          priority_code: 'medium',
          status: 'available',
          created_at: new Date().toISOString(),
        },
      ],
    });

    const { container } = render(App);

    await waitFor(() => {
      expect(container.textContent).toContain('Test Gift');
    });
  });

  it('renders invite registration from hash route', async () => {
    window.location.hash = '#/invite/test-token';
    mockApi();

    const { container } = render(App);

    await waitFor(() => {
      expect(container.textContent).toContain('Invite registration');
      expect(container.querySelector('#invite-name')?.value).toBe('Invited User');
    });
  });
});
