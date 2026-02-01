<script>
  import { createEventDispatcher } from 'svelte';
  import { fade, fly } from 'svelte/transition';
  import { t } from './utils/i18n.js';

  export let gift;

  const dispatch = createEventDispatcher();

  let adminPassword = '';
  let loading = false;
  let error = '';

  async function handleDelete() {
    error = '';

    if (!adminPassword) {
      error = $t('validation.required');
      return;
    }

    const confirmMsg = $t('modals.delete.confirm', { name: gift.name });
    if (!confirm(confirmMsg)) {
      return;
    }

    loading = true;

    try {
      const response = await fetch(`/api/gifts/${gift.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Password': adminPassword
        }
      });

      if (!response.ok) {
        const err = await response.json();
        error = err.error || $t('toasts.error');
        return;
      }

      dispatch('deleted');
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
</script>

<div
  class="modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
  transition:fade={{ duration: 200 }}
  on:click={handleClickOutside}
>
  <div
    class="bg-slate-800 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-700/50 w-full max-w-lg"
    transition:fly={{ y: 50, opacity: 0, duration: 300 }}
  >
    <!-- Header -->
    <div class="px-8 py-6 border-b border-slate-700/50">
      <h2 class="text-2xl font-bold bg-gradient-to-r from-red-400 to-red-500 bg-clip-text text-transparent">
        🗑️ {$t('modals.delete.title')}
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

      <p class="text-slate-400">
        {$t('modals.delete.confirm', { name: gift.name })}
      </p>

      <div>
        <label class="block text-sm font-semibold text-slate-300 mb-2">🔒 {$t('validation.adminPassword')} *</label>
        <input
          type="password"
          bind:value={adminPassword}
          placeholder="••••••••"
          class="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
        />
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
        on:click={handleDelete}
        disabled={loading}
        class="px-6 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 shadow-lg shadow-red-500/30 hover:shadow-red-500/50 transition-all duration-300 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
      >
        {loading ? $t('app.loading') : $t('actions.delete')}
      </button>
    </div>
  </div>
</div>
