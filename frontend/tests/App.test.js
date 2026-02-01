import { describe, it, expect, beforeEach } from 'vitest';
import { render } from '@testing-library/svelte';
import App from '../src/App.svelte';

describe('App', () => {
  beforeEach(() => {
    // Reset fetch mock before each test
    global.fetch = vi.fn();
  });

  it('renders the header', () => {
    const { container } = render(App);
    expect(container.querySelector('h1')).toHaveTextContent('🎁 Wishlist');
  });

  it('shows loading state initially', () => {
    const { container } = render(App);
    // The loading spinner should be present
    expect(container.querySelector('.animate-spin')).toBeTruthy();
  });

  it('displays empty state when no gifts', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => []
    });

    const { container } = render(App);

    // Wait for loading to complete
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(container.textContent).toContain('Список пуст');
  });

  it('displays gifts when loaded', async () => {
    const mockGifts = [
      {
        id: 1,
        name: 'Test Gift',
        category: '🔧 Электроника и гаджеты',
        priority: '🔥 Очень хочу',
        status: 'available',
        created_at: new Date().toISOString()
      }
    ];

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockGifts
    });

    const { container } = render(App);

    // Wait for loading to complete
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(container.textContent).toContain('Test Gift');
  });
});
