<script>
  import { createEventDispatcher } from 'svelte';
  import { fade, fly, scale } from 'svelte/transition';
  import { quintOut } from 'svelte/easing';
  import { t, formatPrice, formatDate } from './utils/i18n.js';
  import { getPriorityColors, getStatusColors } from './utils/tagColors.js';

  export let gift;

  const dispatch = createEventDispatcher();

  // Get colors from centralized helpers
  $: priorityColors = gift.priority_code ? getPriorityColors(gift.priority_code) : null;
  $: statusColors = gift.status !== 'available' ? getStatusColors(gift.status) : null;

  function handleKeydown(e) {
    if (e.key === 'Escape') {
      dispatch('close');
    }
  }

  function handleClickOutside(e) {
    if (e.target.classList.contains('modal-backdrop')) {
      dispatch('close');
    }
  }

  function handleBackdropKeydown(e) {
    if (e.key === 'Enter' || e.key === ' ') {
      dispatch('close');
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

<div
  class="modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
  transition:scale={{ duration: 200, start: 0.95, end: 1, opacity: 1, easing: quintOut }}
  on:click={handleClickOutside}
  on:keydown={handleBackdropKeydown}
  role="button"
  tabindex="-1"
  aria-label="Close modal"
>
  <div
    class="bg-ivory dark:bg-dark-bg rounded-modal shadow-raised border border-black/[0.08] dark:border-white/[0.08] w-full max-w-[var(--width-modal-lg)] max-h-[90vh] overflow-y-auto scrollbar-hide"
    transition:fly={{ y: 50, opacity: 0, duration: 300 }}
    role="dialog"
    aria-modal="true"
    aria-labelledby="modal-title"
    tabindex="-1"
  >
    <!-- Header -->
    <div class="relative sticky top-0 z-10 bg-ivory/95 dark:bg-dark-bg/95 backdrop-blur-xl border-b border-black/[0.08] dark:border-white/[0.08] px-7 py-5">
      <div class="flex items-center justify-between">
        <h2
          id="modal-title"
          class="text-2xl font-medium tracking-tighter text-graphite dark:text-dark-text flex items-center gap-2"
          style="letter-spacing: -0.02em;"
        >
          🎁 {$t('modals.view.title')}
        </h2>
        <button
          on:click={() => dispatch('close')}
          class="w-8 h-8 rounded-full bg-surface dark:bg-surface-dark hover:bg-red-100 dark:hover:bg-red-900/30 border border-black/[0.08] dark:border-white/[0.08] hover:border-red-400 dark:hover:border-red-700/50 flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95"
          aria-label="Close"
        >
          ✕
        </button>
      </div>
    </div>

    <!-- Content -->
    <div class="p-7 space-y-5">
      <!-- Image -->
      {#if gift.image_url}
        <div class="rounded-modal overflow-hidden border border-black/[0.08] dark:border-white/[0.08]">
          <img
            src={gift.image_url}
            alt={gift.name}
            class="w-full h-auto max-h-96 object-cover"
          />
        </div>
      {/if}

      <!-- Title -->
      <h3 class="text-2xl font-medium tracking-tighter text-graphite dark:text-dark-text leading-tight">
        {gift.name}
      </h3>

      <!-- Badges -->
      <div class="flex gap-2 flex-wrap">
        {#if gift.category_code}
          <span class="px-3 py-1.5 rounded-[4px] text-sm text-black/70 dark:text-white/70 bg-surface dark:bg-surface-dark border border-black/[0.08] dark:border-white/[0.08]">
            {$t(`categories.${gift.category_code}`)}
          </span>
        {/if}

        {#if gift.priority_code}
          <span class="px-3 py-1.5 rounded-[4px] text-sm {priorityColors.bg} {priorityColors.text} {priorityColors.border} border">
            {$t(`priorities.${gift.priority_code}`)}
          </span>
        {/if}

        {#if gift.status !== 'available'}
          <span class="px-3 py-1.5 rounded-[4px] text-sm {statusColors.bg} {statusColors.text} {statusColors.border} border">
            {$t(`status.${gift.status}`)}
          </span>
        {/if}
      </div>

      <!-- Description -->
      {#if gift.description}
        <div class="space-y-2">
          <h4 class="text-xs font-semibold tracking-widest uppercase text-black/70 dark:text-white/70">
            {$t('modals.view.description')}
          </h4>
          <p class="text-graphite dark:text-dark-text leading-relaxed whitespace-pre-wrap">
            {gift.description}
          </p>
        </div>
      {/if}

      <!-- Price -->
      {#if gift.price}
        <div class="space-y-2">
          <h4 class="text-xs font-semibold tracking-widest uppercase text-black/70 dark:text-white/70">
            {$t('modals.view.price')}
          </h4>
          <p
            class="font-mono text-2xl font-medium tracking-tight text-emerald-600 dark:text-emerald-400"
          >
            {$formatPrice(gift.price)}
          </p>
        </div>
      {/if}

      <!-- Link -->
      {#if gift.link}
        <div class="space-y-2">
          <h4 class="text-xs font-semibold tracking-widest uppercase text-black/70 dark:text-white/70">
            {$t('modals.view.link')}
          </h4>
          <a
            href={gift.link}
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center gap-2 px-4 py-2 rounded-[4px] text-sm font-semibold text-indigo-600 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-900/30 hover:bg-indigo-200 dark:hover:bg-indigo-900/50 border border-indigo-300 dark:border-indigo-700/50 transition-all duration-200 hover:scale-105"
          >
            🔗 {$t('modals.view.openLink')}
          </a>
        </div>
      {/if}

      <!-- Reservation Info -->
      {#if gift.status === 'reserved' || gift.status === 'purchased'}
        <div class="space-y-3 p-4 rounded-modal {gift.status === 'reserved'
          ? 'bg-amber-100 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700/50'
          : 'bg-emerald-100 dark:bg-emerald-900/20 border-emerald-300 dark:border-emerald-700/50'} border">
          <h4
            class="text-sm font-semibold {statusColors.text} uppercase tracking-wide"
          >
            {$t(`status.${gift.status}`)}
          </h4>
          {#if gift.reserved_by}
            <p class="text-sm {statusColors.text}">
              {$t('modals.view.reservedBy')}: {gift.reserved_by}
            </p>
          {/if}
          {#if gift.reserved_at}
            <p class="text-sm {statusColors.text}">
              {$t('modals.view.reservedAt')}: {$formatDate(gift.reserved_at)}
            </p>
          {/if}
        </div>
      {/if}

      <!-- Created Date -->
      {#if gift.created_at}
        <div class="pt-4 border-t border-black/[0.08] dark:border-white/[0.08]">
          <p class="text-xs text-black/60 dark:text-white/60">
            {$t('modals.view.createdAt')}: {$formatDate(gift.created_at)}
          </p>
        </div>
      {/if}
    </div>

    <!-- Footer -->
    <div class="px-7 py-5 border-t border-black/[0.08] dark:border-white/[0.08]">
      {#if gift.status === 'available'}
        <button
          on:click={() => dispatch('reserve')}
          class="w-full min-w-[fit-content] whitespace-nowrap py-2.5 px-4 rounded-full text-[13px] font-semibold tracking-tight text-white bg-[#18181b] dark:bg-white dark:text-graphite hover:bg-[#27272a] dark:hover:bg-white/90 shadow-editorial transition-all duration-200 hover:shadow-editorial-lg hover:-translate-y-0.5 active:translate-y-0"
        >
          🎁 {$t('actions.reserve')}
        </button>
      {:else if gift.status === 'reserved'}
        <button
          on:click={() => dispatch('purchased')}
          class="w-full min-w-[fit-content] whitespace-nowrap py-2.5 px-4 rounded-full text-[13px] font-semibold tracking-tight text-white bg-[#18181b] dark:bg-white dark:text-graphite hover:bg-[#27272a] dark:hover:bg-white/90 shadow-editorial transition-all duration-200 hover:shadow-editorial-lg hover:-translate-y-0.5 active:translate-y-0"
        >
          ✅ {$t('actions.markPurchased')}
        </button>
      {/if}
    </div>
  </div>
</div>
