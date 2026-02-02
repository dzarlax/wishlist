<script>
  import { createEventDispatcher } from 'svelte';
  import { fade, fly } from 'svelte/transition';
  import { t, formatPrice, formatDate } from './utils/i18n.js';

  export let gift;

  const dispatch = createEventDispatcher();

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
  class="modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
  transition:fade={{ duration: 200 }}
  on:click={handleClickOutside}
  on:keydown={handleBackdropKeydown}
  role="button"
  tabindex="-1"
  aria-label="Close modal"
>
  <div
    class="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700/50 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
    transition:fly={{ y: 50, opacity: 0, duration: 300 }}
    role="dialog"
    aria-modal="true"
    aria-labelledby="modal-title"
    tabindex="-1"
  >
    <!-- Header -->
    <div class="sticky top-0 z-10 bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl border-b border-slate-200 dark:border-slate-700/50 px-6 py-4">
      <div class="flex items-center justify-between">
        <h2
          id="modal-title"
          class="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2"
        >
          🎁 {$t('modals.view.title')}
        </h2>
        <button
          on:click={() => dispatch('close')}
          class="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-700/50 hover:bg-red-100 dark:hover:bg-red-900/30 border border-slate-300 dark:border-slate-600/50 hover:border-red-400 dark:hover:border-red-700/50 flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95"
          aria-label="Close"
        >
          ✕
        </button>
      </div>
    </div>

    <!-- Content -->
    <div class="p-6 space-y-6">
      <!-- Image -->
      {#if gift.image_url}
        <div class="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700/50">
          <img
            src={gift.image_url}
            alt={gift.name}
            class="w-full h-auto max-h-96 object-cover"
          />
        </div>
      {/if}

      <!-- Title -->
      <h3 class="text-2xl font-bold text-slate-900 dark:text-white leading-tight">
        {gift.name}
      </h3>

      <!-- Badges -->
      <div class="flex gap-2 flex-wrap">
        {#if gift.category_code}
          <span class="px-3 py-1.5 rounded-lg text-sm text-slate-700 dark:text-slate-300 bg-slate-200 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700/50">
            {$t(`categories.${gift.category_code}`)}
          </span>
        {/if}

        {#if gift.priority_code}
          <span
            class="px-3 py-1.5 rounded-lg text-sm {gift.priority_code === 'hot'
              ? 'text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/30 border-red-200 dark:border-red-800/50'
              : gift.priority_code === 'medium'
                ? 'text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800/50'
                : 'text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800/50'} border"
          >
            {$t(`priorities.${gift.priority_code}`)}
          </span>
        {/if}

        {#if gift.status !== 'available'}
          <span
            class="px-3 py-1.5 rounded-lg text-sm {gift.status === 'reserved'
              ? 'text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800/50'
              : 'text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800/50'} border"
          >
            {$t(`status.${gift.status}`)}
          </span>
        {/if}
      </div>

      <!-- Description -->
      {#if gift.description}
        <div class="space-y-2">
          <h4 class="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
            {$t('modals.view.description')}
          </h4>
          <p class="text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
            {gift.description}
          </p>
        </div>
      {/if}

      <!-- Price -->
      {#if gift.price}
        <div class="space-y-2">
          <h4 class="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
            {$t('modals.view.price')}
          </h4>
          <p
            class="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-emerald-400 dark:to-teal-400 bg-clip-text text-transparent"
          >
            {$formatPrice(gift.price)}
          </p>
        </div>
      {/if}

      <!-- Link -->
      {#if gift.link}
        <div class="space-y-2">
          <h4 class="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
            {$t('modals.view.link')}
          </h4>
          <a
            href={gift.link}
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-indigo-600 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-900/30 hover:bg-indigo-200 dark:hover:bg-indigo-900/50 border border-indigo-300 dark:border-indigo-700/50 transition-all duration-200 hover:scale-105"
          >
            🔗 {$t('modals.view.openLink')}
          </a>
        </div>
      {/if}

      <!-- Reservation Info -->
      {#if gift.status === 'reserved' || gift.status === 'purchased'}
        <div class="space-y-3 p-4 rounded-xl {gift.status === 'reserved'
          ? 'bg-amber-100 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700/50'
          : 'bg-emerald-100 dark:bg-emerald-900/20 border-emerald-300 dark:border-emerald-700/50'} border">
          <h4
            class="text-sm font-semibold {gift.status === 'reserved'
              ? 'text-amber-800 dark:text-amber-200'
              : 'text-emerald-800 dark:text-emerald-200'} uppercase tracking-wide"
          >
            {$t(`status.${gift.status}`)}
          </h4>
          {#if gift.reserved_by}
            <p class="text-sm {gift.status === 'reserved'
              ? 'text-amber-700 dark:text-amber-300'
              : 'text-emerald-700 dark:text-emerald-300'}">
              {$t('modals.view.reservedBy')}: {gift.reserved_by}
            </p>
          {/if}
          {#if gift.reserved_at}
            <p class="text-sm {gift.status === 'reserved'
              ? 'text-amber-700 dark:text-amber-300'
              : 'text-emerald-700 dark:text-emerald-300'}">
              {$t('modals.view.reservedAt')}: {$formatDate(gift.reserved_at)}
            </p>
          {/if}
        </div>
      {/if}

      <!-- Created Date -->
      {#if gift.created_at}
        <div class="pt-4 border-t border-slate-200 dark:border-slate-700/50">
          <p class="text-xs text-slate-500 dark:text-slate-400">
            {$t('modals.view.createdAt')}: {$formatDate(gift.created_at)}
          </p>
        </div>
      {/if}
    </div>
  </div>
</div>
