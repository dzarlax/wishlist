<script>
  import { createEventDispatcher } from 'svelte';
  import { fly, scale } from 'svelte/transition';
  import { quintOut } from 'svelte/easing';
  import { toasts } from './stores/toasts.js';
  import { auth } from './stores/auth.js';
  import { t } from './utils/i18n.js';
  import { designSystem } from './utils/design-system.js';

  export let userSlug = null;

  const dispatch = createEventDispatcher();

  let password = '';
  let loading = false;
  let ssoConfig = { sso: false };

  auth.ssoConfig.subscribe(val => { ssoConfig = val || { sso: false }; });

  async function handlePasswordLogin() {
    if (!password.trim() || !userSlug) return;
    loading = true;

    try {
      await auth.loginWithPassword(userSlug, password);
      toasts.success($t('auth.loginSuccess'));
      dispatch('authenticated');
    } catch (error) {
      toasts.error(error.message || $t('auth.loginFailed'));
    } finally {
      loading = false;
    }
  }

  function handleSsoLogin() {
    // Direct navigation — must use assign to escape the modal/SPA
    window.location.assign('/api/auth/sso/redirect');
  }

  function handleClickOutside(event) {
    if (event.target.classList.contains('modal-backdrop')) {
      dispatch('close');
    }
  }

  function handleKeydown(event) {
    if (event.key === 'Escape') dispatch('close');
    if (event.key === 'Enter') handlePasswordLogin();
  }
</script>

<svelte:window on:keydown={handleKeydown} />

<div
  class="modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
  transition:scale={{ duration: 200, start: 0.95, easing: quintOut }}
  on:click={handleClickOutside}
  role="button"
  tabindex="-1"
  aria-label="Close modal"
>
  <div
    class="bg-ivory dark:bg-dark-bg backdrop-blur-xl rounded-modal shadow-raised border border-black/[0.08] dark:border-white/[0.08] w-full max-w-[var(--width-modal)] scrollbar-hide"
    transition:fly={{ y: 50, opacity: 0, duration: 300 }}
    role="dialog"
    aria-modal="true"
    aria-labelledby="login-modal-title"
    tabindex="-1"
  >
    <!-- Header -->
    <div class="relative px-7 py-5 border-b {designSystem.color.neutral.border.DEFAULT} dark:border-white/[0.08]">
      <h2
        id="login-modal-title"
        class="{designSystem.text['2xl']} {designSystem.text.weight.medium} {designSystem.text.tracking.tighter} text-graphite dark:text-dark-text"
      >
        🔒 {$t('auth.login')}
      </h2>
    </div>

    <!-- Body -->
    <div class="p-7 space-y-5">
      {#if ssoConfig.sso}
        <!-- SSO Button -->
        <button
          on:click={handleSsoLogin}
          class="w-full py-3 px-4 rounded-none {designSystem.text.weight.semibold} text-white bg-indigo-600 hover:bg-indigo-500 transition-all duration-300"
        >
          {$t('auth.loginWithSso')}
        </button>

        <div class="flex items-center gap-3">
          <div class="flex-1 h-px bg-black/10 dark:bg-white/10"></div>
          <span class="{designSystem.text.xs} text-black/40 dark:text-white/40">{$t('auth.or')}</span>
          <div class="flex-1 h-px bg-black/10 dark:bg-white/10"></div>
        </div>
      {/if}

      <!-- Password Input -->
      <div>
        <label for="auth-password" class="block {designSystem.text.combinations.label} text-black/70 dark:text-white/70 mb-2">
          {$t('auth.password')} *
        </label>
        <input
          id="auth-password"
          type="password"
          bind:value={password}
          placeholder="••••••••"
          disabled={loading}
          class="w-full {designSystem.text.spacing.input} bg-white/80 dark:bg-dark-bg/80 border {designSystem.color.neutral.border.DEFAULT} dark:border-white/[0.08] rounded-none text-graphite dark:text-dark-text placeholder-black/40 dark:placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black/10 transition-all disabled:opacity-50"
        />
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
        on:click={handlePasswordLogin}
        disabled={loading || !password.trim()}
        class="px-4 py-2 rounded-none {designSystem.text.weight.semibold} text-white bg-graphite dark:bg-black hover:bg-black dark:hover:bg-black transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? $t('app.loading') : $t('auth.login')}
      </button>
    </div>
  </div>
</div>
