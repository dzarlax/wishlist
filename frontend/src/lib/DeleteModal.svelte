<script>
  import { createEventDispatcher } from 'svelte';
  import { fly, scale } from 'svelte/transition';
  import { quintOut } from 'svelte/easing';
  import { t } from './utils/i18n.js';
  import { deleteUserGift } from './utils/api.js';
  import { toasts } from './stores/toasts.js';
  import { designSystem } from './utils/design-system.js';

  export let gift;
  export let userSlug = null;

  const dispatch = createEventDispatcher();

  let loading = false;
  let error = '';

  async function handleDelete() {
    error = '';
    loading = true;

    try {
      await deleteUserGift(userSlug, gift.id);
      toasts.success($t('toasts.deleted'));
      dispatch('deleted');
    } catch (e) {
      error = e.message || $t('toasts.error');
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
    if (event.key === 'Escape') dispatch('close');
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
    class="bg-ivory dark:bg-dark-bg backdrop-blur-xl rounded-modal shadow-raised border border-black/[0.08] dark:border-white/[0.08] w-full max-w-[var(--width-modal)]"
    transition:fly={{ y: 50, opacity: 0, duration: 300 }}
    role="dialog"
    aria-modal="true"
    aria-labelledby="delete-modal-title"
    tabindex="-1"
  >
    <div class="relative px-7 py-5 border-b {designSystem.color.neutral.border.DEFAULT} dark:border-white/[0.08]">
      <h2
        id="delete-modal-title"
        class="{designSystem.text['2xl']} {designSystem.text.weight.medium} {designSystem.text.tracking.tighter} text-graphite dark:text-dark-text"
      >
        🗑️ {$t('modals.delete.title')}
      </h2>
    </div>

    <div class="p-7 space-y-5">
      {#if error}
        <div class="bg-red-500/10 border border-red-500/30 rounded-[4px] px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      {/if}

      <p class="text-black/70 dark:text-white/70">
        {$t('modals.delete.confirm', { name: gift.name })}
      </p>
    </div>

    <div class="px-7 py-5 border-t {designSystem.color.neutral.border.DEFAULT} dark:border-white/[0.08] flex gap-3 justify-end">
      <button
        on:click={() => dispatch('close')}
        class="h-10 px-4 rounded-full font-medium {designSystem.color.secondary.bg} {designSystem.color.secondary.bgDark} {designSystem.color.secondary.text} {designSystem.color.secondary.textDark} {designSystem.color.secondary.hover} {designSystem.color.secondary.hoverDark} transition-all duration-200"
      >
        {$t('actions.cancel')}
      </button>
      <button
        on:click={handleDelete}
        disabled={loading}
        class="h-10 px-4 rounded-full font-medium text-white bg-red-600 dark:bg-red-500 hover:bg-red-500 dark:hover:bg-red-400 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? $t('app.loading') : $t('actions.delete')}
      </button>
    </div>
  </div>
</div>
