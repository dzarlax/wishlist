import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, waitFor } from '@testing-library/svelte';
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

function mockApi({ gifts = [], invite = null } = {}) {
  global.fetch = vi.fn(async (url) => {
    const path = String(url);
    if (path === '/api/auth/config') return jsonResponse({ sso: false });
    if (path === '/api/users') return jsonResponse(users);
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

  it('renders the wishlist directory service explanation', async () => {
    const { container } = render(App);

    await waitFor(() => {
      expect(container.textContent).toContain('Whose wishlist?');
      expect(container.textContent).toContain('Open wishlist');
      expect(container.textContent).toContain('For guests');
      expect(container.textContent).toContain('Want your own wishlist?');
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
