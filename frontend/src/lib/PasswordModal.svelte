<script>
  import { createEventDispatcher } from 'svelte';
  import { fade, fly } from 'svelte/transition';
  import { onMount } from 'svelte';
  import { toasts } from './stores/toasts.js';
  import { getAdminPassword, setAdminPassword } from './utils/api.js';
  import { t } from './utils/i18n.js';

  const dispatch = createEventDispatcher();

  let password = '';
  let loading = false;

  onMount(() => {
    const saved = getAdminPassword();
    if (saved) {
      password = saved;
    }
  });

  async function handleSubmit() {
    if (!password.trim()) {
      toasts.error($t('validation.required'));
      return;
    }

    loading = true;

    try {
      // Simply save the password - will be verified when actually creating a gift
      setAdminPassword(password);
      toasts.success('Пароль сохранен');
      dispatch('authenticated', { password });
    } catch (err) {
      toasts.error($t('toasts.error'));
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
    if (event.key === 'Enter') {
      handleSubmit();
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
    class="bg-slate-800 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-700/50 w-full max-w-md"
    transition:fly={{ y: 50, opacity: 0, duration: 300 }}
    role="dialog"
    aria-modal="true"
    aria-labelledby="password-modal-title"
    tabindex="-1"
  >
    <!-- Header -->
    <div class="px-8 py-6 border-b border-slate-700/50">
      <h2 id="password-modal-title" class="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-pink-400 bg-clip-text text-transparent">
        🔒 {$t('validation.adminPassword')}
      </h2>
    </div>

    <!-- Body -->
    <div class="p-8 space-y-6">
      <p class="text-sm text-slate-400">
        Для добавления подарков и использования AI необходимо ввести пароль администратора.
      </p>

      <!-- Password Input -->
      <div>
        <label for="auth-password" class="block text-sm font-semibold text-slate-300 mb-2">Пароль *</label>
        <input
          id="auth-password"
          type="password"
          bind:value={password}
          placeholder="••••••••"
          disabled={loading}
          class="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all disabled:opacity-50"
        />
        <p class="mt-2 text-xs text-slate-500">
          💾 Пароль будет сохранен в браузере для удобства
        </p>
      </div>
    </div>

    <!-- Footer -->
    <div class="px-8 py-6 border-t border-slate-700/50 flex gap-3 justify-end">
      <button
        on:click={() => dispatch('close')}
        disabled={loading}
        class="px-6 py-3 rounded-xl font-semibold text-slate-300 hover:text-white bg-slate-700/50 hover:bg-slate-700 border border-slate-600/50 transition-all duration-300 disabled:opacity-50"
      >
        {$t('actions.cancel')}
      </button>
      <button
        on:click={handleSubmit}
        disabled={loading}
        class="px-6 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-indigo-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 transition-all duration-300 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
      >
        {loading ? $t('app.loading') : 'Войти'}
      </button>
    </div>
  </div>
</div>
