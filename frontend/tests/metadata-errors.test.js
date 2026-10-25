import { beforeEach, expect, it, vi } from 'vitest';
import { fireEvent, render, waitFor } from '@testing-library/svelte';
import AddGiftModal from '../src/lib/AddGiftModal.svelte';
import { locale } from '../src/lib/stores/locale.js';
import { toasts } from '../src/lib/stores/toasts.js';
import { parseGift } from '../src/lib/utils/api.js';

vi.mock('../src/lib/stores/toasts.js', () => ({ toasts: { error: vi.fn(), success: vi.fn() } }));
vi.mock('../src/lib/utils/api.js', () => ({
  parseGift: vi.fn(),
  createUserGift: vi.fn(),
  fetchCategories: vi.fn(async () => []),
  fetchPriorities: vi.fn(async () => []),
}));

beforeEach(() => {
  vi.clearAllMocks();
  locale.set('en');
});

it('shows a localized blocked URL message without exposing the input or internal details', async () => {
  parseGift.mockRejectedValue(
    Object.assign(new Error('internal-host secret query'), { code: 'METADATA_URL_BLOCKED' })
  );
  const { container } = render(AddGiftModal, { props: { userSlug: 'owner', canUseAi: true } });
  const input =
    container.querySelector('input[placeholder="Describe a gift or paste a link..."]') ||
    container.querySelector('.flex.gap-2 input');
  expect(input).toBeTruthy();
  await fireEvent.input(input, { target: { value: 'http://127.0.0.1/private' } });
  await fireEvent.keyDown(input, { key: 'Enter' });
  await waitFor(() => {
    expect(toasts.error).toHaveBeenCalledWith(
      'This link cannot be used to retrieve product details. Use a public product page.'
    );
  });
  expect(toasts.error.mock.calls[0][0]).not.toContain('secret');
});

it('retains normal AI autofill and the generic message for other failures', async () => {
  parseGift
    .mockResolvedValueOnce({ name: 'Normal gift', description: 'Something useful' })
    .mockRejectedValueOnce(new Error('unknown failure'));
  const { container } = render(AddGiftModal, { props: { userSlug: 'owner', canUseAi: true } });
  const input = container.querySelector('.flex.gap-2 input');
  await fireEvent.input(input, { target: { value: 'A normal gift' } });
  await fireEvent.keyDown(input, { key: 'Enter' });
  await waitFor(() => expect(container.querySelector('#gift-name').value).toBe('Normal gift'));
  await fireEvent.input(input, { target: { value: 'Another gift' } });
  await fireEvent.keyDown(input, { key: 'Enter' });
  await waitFor(() => expect(toasts.error).toHaveBeenCalled());
  expect(toasts.error.mock.calls[0][0]).not.toContain('unknown failure');
});
