<script>
  import { createEventDispatcher } from 'svelte';
  import { fade, fly, scale } from 'svelte/transition';
  import { quintOut } from 'svelte/easing';
  import { toasts } from './stores/toasts.js';
  import { t } from './utils/i18n.js';
  import { designSystem } from './utils/design-system.js';

  // @ts-ignore - Ignore svelteHTML type errors from node_modules
  import { colors, typography } from './utils/design-system.js';

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
          reserved_by: reservedBy.trim() || $t('modals.reserve.yourNamePlaceholder'),
        }),
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
    } catch {
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
  transition:fade|global={{ duration: 200 }}
  on:click={handleClickOutside}
  on:keydown={handleBackdropKeydown}
  role="button"
  tabindex="-1"
  aria-label="Close modal"
>
  <div
    class="bg-ivory dark:bg-dark-bg rounded-modal shadow-raised border border-black/[0.08] dark:border-white/[0.08] w-full max-w-[var(--width-modal)] max-h-[90vh] overflow-y-auto scrollbar-hide"
    transition:scale|global={{ duration: 200, start: 0.95, easing: quintOut }}
    role="dialog"
    aria-modal="true"
    aria-labelledby="reserve-modal-title"
    tabindex="-1"
  >
    <!-- Header -->
    <div class="relative px-7 py-5 border-b {designSystem.color.neutral.border.DEFAULT} dark:border-white/[0.08]">
      <h2
        id="reserve-modal-title"
        class="{designSystem.text['2xl']} {designSystem.text.weight.medium} {designSystem.text.tracking.tighter} text-graphite dark:text-dark-text"
      >
        🔒 {$t('modals.reserve.title')}
      </h2>
    </div>

    <!-- Body -->
    <div class="p-7 space-y-5">
      <!-- Error Message -->
      {#if error}
        <div
          class="bg-red-500/10 border border-red-500/30 rounded-[4px] px-4 py-3 text-sm text-red-300"
        >
          {error}
        </div>
      {/if}

      <div>
        <label for="reserve-name" class="block {designSystem.text.combinations.label} text-black/70 dark:text-white/70 mb-2"
          >{$t('modals.reserve.yourName')} {$t('modals.add.optional')}</label
        >
        <input
          id="reserve-name"
          type="text"
          bind:value={reservedBy}
          placeholder={$t('modals.reserve.yourNamePlaceholder')}
          class="w-full {designSystem.text.spacing.input} bg-white/80 dark:bg-dark-bg/80 border {designSystem.color.neutral.border.DEFAULT} dark:border-white/[0.08] rounded-none text-graphite dark:text-dark-text placeholder-black/40 dark:placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black/10 transition-all"
        />
      </div>

      <div>
        <label for="reserve-secret-code" class="block {designSystem.text.combinations.label} text-black/70 dark:text-white/70 mb-[7px]"
          >🔑 {$t('modals.reserve.secretCode')} *</label
        >
        <input
          id="reserve-secret-code"
          type="text"
          bind:value={secretCode}
          placeholder={$t('modals.reserve.secretCodePlaceholder')}
          class="w-full {designSystem.text.spacing.input} bg-white/80 dark:bg-dark-bg/80 border {designSystem.color.neutral.border.DEFAULT} dark:border-white/[0.08] rounded-none text-graphite dark:text-dark-text placeholder-black/40 dark:placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black/10 transition-all"
        />
        <p class="mt-2 text-sm {designSystem.color.neutral.text.muted} {designSystem.color.neutral.text.mutedDark}">
          ⚠️ {$t('modals.reserve.secretCodeHint')}
        </p>
      </div>
    </div>

    <!-- Footer -->
    <div class="px-7 py-5 border-t {designSystem.color.neutral.border.DEFAULT} dark:border-white/[0.08] flex gap-3 justify-end">
      <button
        on:click={() => dispatch('close')}
        class="h-10 px-4 rounded-full font-medium {designSystem.color.secondary.bg} {designSystem.color.secondary.bgDark} {designSystem.color.secondary.text} {designSystem.color.secondary.textDark} {designSystem.color.secondary.hover} {designSystem.color.secondary.hoverDark} transition-all duration-200"
      >
        {$t('actions.cancel')}
      </button>
      <button
        on:click={handleSubmit}
        disabled={loading}
        class="h-10 px-4 rounded-full font-medium {designSystem.color.primary.bg} {designSystem.color.primary.bgDark} {designSystem.color.primary.text} {designSystem.color.primary.textDark} {designSystem.color.primary.hover} {designSystem.color.primary.hoverDark} transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? $t('app.loading') : $t('actions.reserve')}
      </button>
    </div>
  </div>
</div>

<style>
  .scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }

  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }
</style>
