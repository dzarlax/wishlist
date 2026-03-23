<script>
  import { createEventDispatcher } from 'svelte';
  import { fade, fly, scale } from 'svelte/transition';
  import { quintOut } from 'svelte/easing';
  import { onMount } from 'svelte';
  import { toasts } from './stores/toasts.js';
  import { getAdminPassword, setAdminPassword, verifyUserPassword } from './utils/api.js';
  import { t } from './utils/i18n.js';
  import { designSystem } from './utils/design-system.js';

  export let userSlug = null;

  const dispatch = createEventDispatcher();

  let password = '';
  let loading = false;

  onMount(() => {
    const saved = getAdminPassword(userSlug);
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
      if (userSlug) {
        // Verify per-user password
        await verifyUserPassword(userSlug, password);
      } else {
        // Legacy: verify global password
        const response = await fetch('/api/verify-password', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Admin-Password': password
          }
        });
        if (!response.ok) {
          toasts.error('Неверный пароль');
          return;
        }
      }

      // Password is valid - save it
      setAdminPassword(password, userSlug);
      toasts.success('Пароль сохранен');
      dispatch('authenticated', { password });
    } catch {
      toasts.error('Неверный пароль');
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

  function handleBackdropKeydown(event) {
    // Don't close if focus is on an input element
    const target = event.target;
    const isInput = target.tagName === 'INPUT' ||
                    target.tagName === 'TEXTAREA' ||
                    target.tagName === 'SELECT' ||
                    target.isContentEditable;
    if (isInput) return;

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      dispatch('close');
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

<div
  class="modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
  transition:scale={{ duration: 200, start: 0.95, easing: quintOut }}
  on:click={handleClickOutside}
  on:keydown={handleBackdropKeydown}
  role="button"
  tabindex="-1"
  aria-label="Close modal"
>
  <div
    class="bg-ivory dark:bg-dark-bg backdrop-blur-xl rounded-modal shadow-raised border border-black/[0.08] dark:border-white/[0.08] w-full max-w-[var(--width-modal)] scrollbar-hide"
    transition:fly={{ y: 50, opacity: 0, duration: 300 }}
    role="dialog"
    aria-modal="true"
    aria-labelledby="password-modal-title"
    tabindex="-1"
  >
    <!-- Header -->
    <div class="relative px-7 py-5 border-b {designSystem.color.neutral.border.DEFAULT} dark:border-white/[0.08]">
      <h2
        id="password-modal-title"
        class="{designSystem.text['2xl']} {designSystem.text.weight.medium} {designSystem.text.tracking.tighter} text-graphite dark:text-dark-text"
      >
        🔒 {$t('validation.adminPassword')}
      </h2>
    </div>

    <!-- Body -->
    <div class="p-7 space-y-5">
      <p class="{designSystem.text.sm} text-black/70 dark:text-white/70">
        Для добавления подарков и использования AI необходимо ввести пароль администратора.
      </p>

      <!-- Password Input -->
      <div>
        <label for="auth-password" class="block {designSystem.text.combinations.label} text-black/70 dark:text-white/70 mb-2"
          >Пароль *</label
        >
        <input
          id="auth-password"
          type="password"
          bind:value={password}
          placeholder="••••••••"
          disabled={loading}
          class="w-full {designSystem.text.spacing.input} bg-white/80 dark:bg-dark-bg/80 border {designSystem.color.neutral.border.DEFAULT} dark:border-white/[0.08] rounded-none text-graphite dark:text-dark-text placeholder-black/40 dark:placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black/10 transition-all disabled:opacity-50"
        />
        <p class="mt-2 text-xs {designSystem.color.neutral.text.muted} {designSystem.color.neutral.text.mutedDark}">💾 Пароль будет сохранен в браузере для удобства</p>
      </div>
    </div>

    <!-- Footer -->
    <div class="px-7 py-5 border-t {designSystem.color.neutral.border.DEFAULT} dark:border-white/[0.08] flex gap-3 justify-end">
      <button
        on:click={() => dispatch('close')}
        disabled={loading}
        class="px-4 py-2 rounded-none {designSystem.text.weight.semibold} text-graphite dark:text-dark-text hover:text-black dark:hover:text-white {designSystem.color.neutral.background.surface} {designSystem.color.neutral.background.surfaceDark} hover:bg-[#d8d6d3] dark:hover:bg-[#25292d] transition-all duration-300 disabled:opacity-50"
      >
        {$t('actions.cancel')}
      </button>
      <button
        on:click={handleSubmit}
        disabled={loading}
        class="px-4 py-2 rounded-none {designSystem.text.weight.semibold} text-white bg-graphite dark:bg-black hover:bg-black dark:hover:bg-black transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? $t('app.loading') : 'Войти'}
      </button>
    </div>
  </div>
</div>
