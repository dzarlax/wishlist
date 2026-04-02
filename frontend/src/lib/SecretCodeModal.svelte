<script>
  import { createEventDispatcher } from 'svelte';
  import { fly, scale } from 'svelte/transition';
  import { quintOut } from 'svelte/easing';
  import { t } from './utils/i18n.js';
  import { designSystem } from './utils/design-system.js';

  export let title = '';
  export let description = '';

  const dispatch = createEventDispatcher();

  let secretCode = '';

  function handleSubmit() {
    if (!secretCode.trim()) return;
    dispatch('submit', { secretCode: secretCode.trim() });
  }

  function handleClickOutside(event) {
    if (event.target.classList.contains('modal-backdrop')) {
      dispatch('close');
    }
  }

  function handleKeydown(event) {
    if (event.key === 'Escape') dispatch('close');
    if (event.key === 'Enter') handleSubmit();
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
    tabindex="-1"
  >
    <div class="relative px-7 py-5 border-b {designSystem.color.neutral.border.DEFAULT} dark:border-white/[0.08]">
      <h2 class="{designSystem.text['2xl']} {designSystem.text.weight.medium} {designSystem.text.tracking.tighter} text-graphite dark:text-dark-text">
        {title}
      </h2>
    </div>

    <div class="p-7 space-y-4">
      {#if description}
        <p class="{designSystem.text.sm} text-black/70 dark:text-white/70">{description}</p>
      {/if}
      <input
        type="text"
        bind:value={secretCode}
        placeholder={$t('modals.secretCode.placeholder')}
        class="w-full {designSystem.text.spacing.input} bg-white/80 dark:bg-dark-bg/80 border {designSystem.color.neutral.border.DEFAULT} dark:border-white/[0.08] rounded-none text-graphite dark:text-dark-text placeholder-black/40 dark:placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black/10 transition-all"
        autofocus
      />
    </div>

    <div class="px-7 py-5 border-t {designSystem.color.neutral.border.DEFAULT} dark:border-white/[0.08] flex gap-3 justify-end">
      <button
        on:click={() => dispatch('close')}
        class="px-4 py-2 rounded-none {designSystem.text.weight.semibold} text-graphite dark:text-dark-text {designSystem.color.neutral.background.surface} {designSystem.color.neutral.background.surfaceDark} hover:bg-[#d8d6d3] dark:hover:bg-[#25292d] transition-all duration-300"
      >
        {$t('actions.cancel')}
      </button>
      <button
        on:click={handleSubmit}
        disabled={!secretCode.trim()}
        class="px-4 py-2 rounded-none {designSystem.text.weight.semibold} text-white bg-graphite dark:bg-black hover:bg-black dark:hover:bg-black transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {$t('actions.confirm')}
      </button>
    </div>
  </div>
</div>
