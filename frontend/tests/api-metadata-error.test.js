import { expect, it, vi } from 'vitest';
import { apiRequest } from '../src/lib/utils/api.js';

it('preserves the safe metadata error code for localization', async () => {
  const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok: false,
    status: 400,
    json: async () => ({ error: 'This URL is not allowed.', code: 'METADATA_URL_BLOCKED' }),
  });
  try {
    await expect(apiRequest('/api/parse-gift')).rejects.toMatchObject({
      code: 'METADATA_URL_BLOCKED',
      message: 'This URL is not allowed.',
    });
  } finally {
    fetch.mockRestore();
  }
});
