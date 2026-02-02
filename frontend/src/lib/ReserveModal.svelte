<script>
  import { createEventDispatcher } from 'svelte';
  import { fade, fly } from 'svelte/transition';
  import { toasts } from './stores/toasts.js';
  import { t } from './utils/i18n.js';

  export let gift;

  const dispatch = createEventDispatcher();

  let reservedBy = '';
  let secretCode = '';
  let loading = false;
  let error = '';

  async function handleSubmit() {
    error = '';

    if (!secretCode.trim()) {
      error = $t('validation.secretCodeRequired');
      return;
    }

    loading = true;

    try {
      const response = await fetch(`/api/gifts/${gift.id}/reserve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          secret_code: secretCode.trim(),
          reserved_by: reservedBy.trim() || $t('modals.reserve.yourNamePlaceholder')
        })
      });

      if (!response.ok) {
        const err = await response.json();
        error = err.error || $t('toasts.error');
        return;
      }

      // Copy secret code to clipboard
      try {
        await navigator.clipboard.writeText(secretCode.trim());
        toasts.success($t('toasts.reserved') + `: ${secretCode.trim()}`);
      } catch {
        toasts.success($t('toasts.reserved') + `: ${secretCode.trim()}`);
      }

      dispatch('saved');
    } catch (err) {
      error = $t('toasts.error');
    } finally {
      loading = false;
    }
  }

  function handleClickOutside(event) {
    if (event.target.classList.contains('modal-backdrop')) {
      dispatch('close');
    }
  }

  function handleKeydown(event) {
    if (event.key === 'Escape') {
      dispatch('close');
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

<div
  class="modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
  transition:fade={{ duration: 200 }}
  on:click={handleClickOutside}
>
  <div
    class="bg-slate-800 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-700/50 w-full max-w-lg"
    transition:fly={{ y: 50, opacity: 0, duration: 300 }}
    role="dialog"
    aria-modal="true"
    aria-labelledby="reserve-modal-title"
    tabindex="-1"
  >
    <!-- Header -->
    <div class="px-8 py-6 border-b border-slate-700/50">
      <h2 id="reserve-modal-title" class="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-pink-400 bg-clip-text text-transparent">
        🔒 {$t('modals.reserve.title')}
      </h2>
    </div>

    <!-- Body -->
    <div class="p-8 space-y-6">
      <!-- Error Message -->
      {#if error}
        <div class="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      {/if}

      <div>
        <label for="reserve-name" class="block text-sm font-semibold text-slate-300 mb-2">{$t('modals.reserve.yourName')} {$t('modals.add.optional')}</label>
        <input
          id="reserve-name"
          type="text"
          bind:value={reservedBy}
          placeholder={$t('modals.reserve.yourNamePlaceholder')}
          class="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
        />
      </div>

      <div>
        <label for="reserve-secret-code" class="block text-sm font-semibold text-slate-300 mb-2">🔑 {$t('modals.reserve.secretCode')} *</label>
        <input
          id="reserve-secret-code"
          type="text"
          bind:value={secretCode}
          placeholder={$t('modals.reserve.secretCodePlaceholder')}
          class="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
        />
        <p class="mt-2 text-sm text-slate-400">
          ⚠️ {$t('modals.reserve.secretCodeHint')}
        </p>
      </div>
    </div>

    <!-- Footer -->
    <div class="px-8 py-6 border-t border-slate-700/50 flex gap-3 justify-end">
      <button
        on:click={() => dispatch('close')}
        class="px-6 py-3 rounded-xl font-semibold text-slate-300 hover:text-white bg-slate-700/50 hover:bg-slate-700 border border-slate-600/50 transition-all duration-300"
      >
        {$t('actions.cancel')}
      </button>
      <button
        on:click={handleSubmit}
        disabled={loading}
        class="px-6 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-indigo-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 transition-all duration-300 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
      >
        {loading ? $t('app.loading') : $t('actions.reserve')}
      </button>
    </div>
  </div>
</div>
