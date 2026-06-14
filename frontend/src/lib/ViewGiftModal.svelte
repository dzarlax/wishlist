<script>
  import { createEventDispatcher } from 'svelte';
  import { fly, scale } from 'svelte/transition';
  import { quintOut } from 'svelte/easing';
  import { t, formatPrice, formatDate } from './utils/i18n.js';
  import { getPriorityColors } from './utils/design-system.js';

  export let gift;
  export let isOwner = false;
  export let isGuestReservationOwner = false;

  const dispatch = createEventDispatcher();

  $: priorityColors = gift.priority_code ? getPriorityColors(gift.priority_code) : null;
  $: hasPrice = Boolean(gift.price_display || gift.price);
  $: displayPrice = gift.price_display || (gift.price ? $formatPrice(gift.price) : '');
  $: statusLabel =
    gift.status === 'reserved' && !isOwner
      ? isGuestReservationOwner
        ? $t('status.reservedByYou')
        : $t('status.reservedByOther')
      : gift.status === 'available'
        ? $t('status.available')
        : $t(`status.${gift.status}`);
  $: statusTone =
    gift.status === 'reserved'
      ? 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/25 dark:text-amber-200 dark:border-amber-700/60'
      : gift.status === 'purchased'
        ? 'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/25 dark:text-emerald-200 dark:border-emerald-700/60'
        : gift.status === 'gifted'
          ? 'bg-sky-100 text-sky-700 border-sky-300 dark:bg-sky-900/25 dark:text-sky-200 dark:border-sky-700/60'
          : 'bg-white text-black/70 border-black/[0.08] dark:bg-white/[0.05] dark:text-white/75 dark:border-white/[0.08]';

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
    const target = e.target;
    const isInput =
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.tagName === 'SELECT' ||
      target.isContentEditable;
    if (isInput) return;

    if (e.key === 'Enter' || e.key === ' ') {
      dispatch('close');
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

<div
  class="modal-backdrop fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-6 bg-black/80 backdrop-blur-md"
  transition:scale={{ duration: 200, start: 0.95, easing: quintOut }}
  on:click={handleClickOutside}
  on:keydown={handleBackdropKeydown}
  role="button"
  tabindex="-1"
  aria-label="Close modal"
>
  <div
    class="bg-ivory dark:bg-dark-bg rounded-modal shadow-raised border border-black/[0.08] dark:border-white/[0.08] w-full max-w-[var(--width-modal-lg)] max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-3rem)] overflow-y-auto scrollbar-hide"
    transition:fly={{ y: 50, opacity: 0, duration: 300 }}
    role="dialog"
    aria-modal="true"
    aria-labelledby="gift-modal-title"
    tabindex="-1"
  >
    <div
      class="sticky top-0 z-20 bg-ivory/95 dark:bg-dark-bg/95 backdrop-blur-xl border-b border-black/[0.08] dark:border-white/[0.08] px-5 py-4 sm:px-7"
    >
      <div class="flex items-center justify-between gap-3">
        <span
          class="inline-flex min-w-0 items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold {statusTone}"
        >
          {statusLabel}
        </span>
        <button
          on:click={() => dispatch('close')}
          class="w-9 h-9 shrink-0 rounded-full bg-surface dark:bg-surface-dark hover:bg-red-100 dark:hover:bg-red-900/30 border border-black/[0.08] dark:border-white/[0.08] hover:border-red-400 dark:hover:border-red-700/50 flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95"
          aria-label="Close"
        >
          ✕
        </button>
      </div>
    </div>

    <div class="px-5 py-5 pb-28 space-y-5 sm:px-7 sm:pb-32">
      {#if gift.image_url}
        <div
          class="rounded-modal overflow-hidden border border-black/[0.08] dark:border-white/[0.08] bg-white/70 dark:bg-white/[0.03]"
        >
          <img
            src={gift.image_url}
            alt={gift.name}
            class="w-full max-h-72 sm:max-h-80 object-contain"
          />
        </div>
      {/if}

      <div class="space-y-3">
        <h2
          id="gift-modal-title"
          class="text-2xl sm:text-3xl font-medium text-graphite dark:text-dark-text leading-tight"
        >
          {gift.name}
        </h2>

        <div class="flex gap-2 flex-wrap">
          {#if gift.category_code}
            <span
              class="px-3 py-1.5 rounded-full text-sm text-black/55 dark:text-white/55 bg-surface dark:bg-surface-dark border border-black/[0.08] dark:border-white/[0.08]"
            >
              {$t(`categories.${gift.category_code}`)}
            </span>
          {/if}

          {#if gift.priority_code}
            <span
              class="px-3 py-1.5 rounded-full text-sm {priorityColors.bg} {priorityColors.text} {priorityColors.border} border"
            >
              {$t(`priorities.${gift.priority_code}`)}
            </span>
          {/if}
        </div>
      </div>

      {#if gift.description}
        <section class="space-y-2">
          <h3 class="text-sm font-semibold text-black/70 dark:text-white/70">
            {$t('modals.view.description')}
          </h3>
          <p class="text-graphite dark:text-dark-text leading-relaxed whitespace-pre-wrap">
            {gift.description}
          </p>
        </section>
      {/if}

      {#if isOwner && (gift.created_at || gift.reserved_at)}
        <section class="rounded-modal border border-black/[0.08] dark:border-white/[0.08] bg-white/55 dark:bg-white/[0.03] p-4 space-y-2">
          {#if gift.reserved_at}
            <p class="text-sm text-black/60 dark:text-white/60">
              {$t('modals.view.reservedAt')}: {$formatDate(gift.reserved_at)}
            </p>
          {/if}
          {#if gift.created_at}
            <p class="text-sm text-black/60 dark:text-white/60">
              {$t('modals.view.createdAt')}: {$formatDate(gift.created_at)}
            </p>
          {/if}
        </section>
      {/if}
    </div>

    <div
      class="sticky bottom-0 z-20 border-t border-black/[0.08] dark:border-white/[0.08] bg-ivory/95 dark:bg-dark-bg/95 backdrop-blur-xl px-5 py-4 sm:px-7"
    >
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div class="min-w-0">
          <p class="text-xs font-semibold text-black/45 dark:text-white/45">
            {$t('modals.view.price')}
          </p>
          {#if hasPrice}
            <p
              class="font-mono text-xl font-medium tracking-tight text-emerald-600 dark:text-emerald-400"
            >
              {displayPrice}
            </p>
          {:else}
            <p class="text-sm font-medium text-black/60 dark:text-white/60">
              {$t('giftCard.noPrice')}
            </p>
          {/if}
        </div>

        <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
          {#if gift.link}
            <a
              href={gift.link}
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex min-h-11 items-center justify-center rounded-full border border-black/[0.08] dark:border-white/[0.08] bg-white/70 dark:bg-white/[0.05] px-5 text-sm font-semibold text-graphite dark:text-dark-text hover:bg-white dark:hover:bg-white/[0.08] transition-all duration-200"
            >
              {$t('modals.view.openGiftPage')}
            </a>
          {/if}

          {#if !isOwner && gift.status === 'available'}
            <button
              on:click={() => dispatch('reserve')}
              class="inline-flex min-h-11 items-center justify-center rounded-full px-6 text-sm font-semibold text-white bg-[#18181b] dark:bg-white dark:text-graphite hover:bg-[#27272a] dark:hover:bg-white/90 shadow-editorial transition-all duration-200 hover:shadow-editorial-lg hover:-translate-y-0.5 active:translate-y-0"
            >
              🎁 {$t('actions.reserve')}
            </button>
          {:else if !isOwner && gift.status === 'reserved'}
            <button
              on:click={() => dispatch('purchased')}
              class="inline-flex min-h-11 items-center justify-center rounded-full px-5 text-sm font-semibold text-white bg-[#18181b] dark:bg-white dark:text-graphite hover:bg-[#27272a] dark:hover:bg-white/90 shadow-editorial transition-all duration-200 hover:shadow-editorial-lg hover:-translate-y-0.5 active:translate-y-0"
            >
              ✅ {$t('actions.markPurchased')}
            </button>
            <button
              on:click={() => dispatch('unreserve')}
              class="inline-flex min-h-11 items-center justify-center rounded-full border border-black/[0.08] dark:border-white/[0.08] bg-white/70 dark:bg-white/[0.05] px-5 text-sm font-semibold text-graphite dark:text-dark-text hover:bg-white dark:hover:bg-white/[0.08] transition-all duration-200"
            >
              {$t('modals.view.cancelReservation')}
            </button>
          {:else if !isOwner && gift.status === 'purchased'}
            <button
              on:click={() => dispatch('unreserve')}
              class="inline-flex min-h-11 items-center justify-center rounded-full border border-black/[0.08] dark:border-white/[0.08] bg-white/70 dark:bg-white/[0.05] px-5 text-sm font-semibold text-graphite dark:text-dark-text hover:bg-white dark:hover:bg-white/[0.08] transition-all duration-200"
            >
              {$t('modals.view.cancelReservation')}
            </button>
          {/if}
        </div>
      </div>
    </div>
  </div>
</div>
