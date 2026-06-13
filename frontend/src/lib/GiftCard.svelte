<script>
  import { createEventDispatcher } from 'svelte';
  import { fade, fly } from 'svelte/transition';
  import { quintOut } from 'svelte/easing';
  import { toasts } from './stores/toasts.js';
  import { t, formatPrice } from './utils/i18n.js';
  import { designSystem, getPriorityColors } from './utils/design-system.js';

  export let gift;
  export let index = 0;
  export let isLarge = false;
  export let isOwner = false;
  export let isGuestReservationOwner = false;

  const dispatch = createEventDispatcher();

  let imageError = false;
  let error = '';
  let loading = false;
  let hovered = false;

  $: currentPriorityCode = gift.priority_code || 'medium';
  $: priorityColorClasses = getPriorityColors(currentPriorityCode);
  $: hasPrice = Boolean(gift.price_display || gift.price);

  function handleKeydown(event) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      dispatch('view');
    }
  }

  function handleReserve() {
    if (gift.status === 'available') {
      dispatch('reserve');
    } else if (gift.status === 'reserved') {
      // Dispatch event to parent — parent shows SecretCodeModal
      dispatch('purchased');
    }
  }

  function handleUnreserve() {
    // Dispatch event to parent — parent shows SecretCodeModal
    dispatch('unreserve');
  }

  async function copyGiftLink() {
    if (!gift.link) return;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(gift.link);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = gift.link;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        textArea.remove();
      }
      toasts.success($t('toasts.copySuccess'));
    } catch {
      toasts.error($t('users.linkCopyFailed'));
    }
  }

  $: status = (() => {
    switch (gift.status) {
      case 'reserved':
        return {
          text: `🔒 ${isGuestReservationOwner ? $t('status.reservedByYou') : $t('status.reservedByOther')}`,
          dotClass: 'bg-amber-500',
          textClass: 'text-amber-700 dark:text-amber-300',
          bgClass: 'bg-amber-500/10',
          borderClass: 'border-amber-500/30',
        };
      case 'purchased':
        return {
          text: `✅ ${$t('status.purchased')}`,
          dotClass: 'bg-blue-500',
          textClass: 'text-blue-700 dark:text-blue-300',
          bgClass: 'bg-blue-500/10',
          borderClass: 'border-blue-500/30',
        };
      case 'gifted':
        return {
          text: `🎉 ${$t('status.gifted')}`,
          dotClass: 'bg-violet-500',
          textClass: 'text-violet-700 dark:text-violet-300',
          bgClass: 'bg-violet-500/10',
          borderClass: 'border-violet-500/30',
        };
      default:
        return { text: '', dotClass: '', textClass: '', bgClass: '', borderClass: '' };
    }
  })();
</script>

<article
  class="gift-card group relative flex flex-col rounded-[12px] overflow-visible border transition-all duration-300 ease-out {gift.status ===
  'available'
    ? 'bg-ivory dark:bg-dark-bg border-black/[0.08] dark:border-white/[0.08] hover:border-indigo-400/50 dark:hover:border-indigo-500/30 hover:shadow-editorial-lg hover:-translate-y-1 ring-1 ring-inset ring-black/5 dark:ring-white/5'
    : 'bg-surface-hover dark:bg-[#15171A] border-black/[0.08] dark:border-white/[0.08] ring-1 ring-inset ring-black/[0.03] dark:ring-white/[0.04]'}"
  on:mouseenter={() => (hovered = true)}
  on:mouseleave={() => (hovered = false)}
  in:fly={{ y: 50, opacity: 0, duration: 400, delay: index * 50, easing: quintOut }}
>
  <!-- Image -->
  <div
    role="button"
    tabindex="0"
    class="relative {isLarge
      ? 'h-56'
      : 'h-40'} overflow-hidden rounded-t-[12px] bg-[#f4f4f5] dark:bg-white/5 flex-shrink-0 cursor-pointer"
    on:click={() => dispatch('view')}
    on:keydown={handleKeydown}
    aria-label="View details for {gift.name}"
  >
    {#if gift.image_url && !imageError}
      <img
        src={gift.image_url}
        alt={gift.name}
        class="w-full h-full object-contain transition-transform duration-500 ease-out {hovered
          ? 'scale-110'
          : 'scale-100'} {gift.status !== 'available' ? 'grayscale opacity-70' : ''}"
        on:error={() => (imageError = true)}
      />
    {:else}
      <div
        class="w-full h-full flex items-center justify-center {designSystem.text[
          '4xl'
        ]} opacity-30 transition-transform duration-500 ease-out {hovered
          ? 'scale-110 rotate-5'
          : 'scale-100'}"
      >
        🎁
      </div>
    {/if}

    {#if status.text}
      <div
        class="absolute left-3 top-3 flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium shadow-editorial backdrop-blur-md {status.bgClass} {status.borderClass}"
        transition:fade={{ duration: 200 }}
      >
        {#if status.dotClass}
          <span class="h-1.5 w-1.5 rounded-full {status.dotClass}"></span>
        {/if}
        <span class={status.textClass}>{status.text}</span>
      </div>
    {/if}

    {#if gift.status === 'available' && currentPriorityCode === 'hot'}
      <div
        class="absolute top-3 right-3 w-3 h-3 rounded-full bg-red-500 animate-pulse shadow-lg shadow-red-500/50"
      ></div>
    {/if}
  </div>

  <!-- Content -->
  <div
    role="button"
    tabindex="0"
    class="p-5 flex flex-col flex-1 backdrop-blur-sm cursor-pointer gap-3"
    on:click={() => dispatch('view')}
    on:keydown={handleKeydown}
    aria-label="View details for {gift.name}"
  >
    {#if error}
      <div
        class="bg-red-500/10 border border-red-500/20 rounded-none px-3 py-2 {designSystem.text
          .xs} text-red-600 dark:text-red-300 flex items-center gap-2 flex-shrink-0"
        transition:fade={{ duration: 200 }}
      >
        <span>⚠️</span><span>{error}</span>
      </div>
    {/if}

    <div class="flex gap-2 flex-wrap flex-shrink-0 items-center">
      {#if gift.category_code}
        <span
          class="{designSystem.text.xs} text-black/45 dark:text-white/40"
          title={$t(`categories.${gift.category_code}`)}
        >
          {$t(`categories.${gift.category_code}`)}
        </span>
      {/if}
      <span
        class="px-2 py-0.5 rounded-full text-xs font-medium {priorityColorClasses.bg} {priorityColorClasses.bgDark} {priorityColorClasses.text} {priorityColorClasses.textDark} border {priorityColorClasses.border} {priorityColorClasses.borderDark}"
      >
        {$t(`priorities.${currentPriorityCode}`)}
      </span>
    </div>

    <h3
      class="{isLarge
        ? designSystem.text.xl
        : designSystem.text
            .base} text-graphite dark:text-dark-text leading-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors duration-200 flex-shrink-0"
    >
      {gift.name}
    </h3>

    {#if gift.description}
      <p
        class="{designSystem.color.neutral.text.muted} {designSystem.color.neutral.text
          .mutedDark} {designSystem.text.base} line-clamp-2 {designSystem.text.leading
          .relaxed} flex-shrink-0"
      >
        {gift.description}
      </p>
    {/if}

    <div class="flex-1 min-h-0"></div>
  </div>

  {#if isOwner}
    <div class="px-5 pt-3 pb-5 border-t border-black/[0.08] dark:border-white/[0.08]">
      <div
        class="relative flex items-center justify-between gap-3 rounded-[10px] bg-black/[0.03] px-3 py-2 dark:bg-white/[0.04]"
      >
        <div class="min-w-0">
          {#if hasPrice}
            <div
              role="button"
              tabindex="0"
              class="cursor-pointer"
              on:click={() => dispatch('view')}
              on:keydown={handleKeydown}
              aria-label="View details for {gift.name}"
            >
              <span
                class="font-mono {designSystem.text.lg} {designSystem.color.status.available
                  .text} {designSystem.color.status.available.textDark}"
              >
                {gift.price_display || $formatPrice(gift.price)}
              </span>
            </div>
          {/if}
          <div class="{designSystem.text.xs} text-black/55 dark:text-white/50">
            {#if gift.status === 'available'}
              {$t('status.available')}
            {:else}
              {status.text}
            {/if}
          </div>
        </div>

        <details class="owner-card-menu flex-shrink-0">
          <summary
            class="flex h-8 w-8 cursor-pointer list-none items-center justify-center rounded-full border border-black/[0.08] bg-white/80 text-base leading-none text-black/65 transition-all hover:bg-white hover:text-black dark:border-white/[0.10] dark:bg-white/[0.06] dark:text-white/70 dark:hover:text-white"
            title={$t('filters.more')}
            aria-label={$t('filters.more')}
          >
            ⋯
          </summary>
          <div
            class="absolute bottom-12 right-0 z-20 w-40 overflow-hidden rounded-[12px] border border-black/[0.08] bg-white text-sm shadow-editorial-lg dark:border-white/[0.10] dark:bg-[#202226]"
          >
            {#if gift.link}
              <a
                href={gift.link}
                target="_blank"
                rel="noopener noreferrer"
                class="flex w-full items-center gap-2 px-3 py-2.5 text-left text-graphite transition-colors hover:bg-black/[0.04] dark:text-dark-text dark:hover:bg-white/[0.06]"
              >
                <span>🔗</span>
                <span>{$t('actions.openLink')}</span>
              </a>
              <button
                on:click={copyGiftLink}
                class="flex w-full items-center gap-2 px-3 py-2.5 text-left text-graphite transition-colors hover:bg-black/[0.04] dark:text-dark-text dark:hover:bg-white/[0.06]"
              >
                <span>📋</span>
                <span>{$t('actions.copyLink')}</span>
              </button>
            {/if}
            <button
              on:click={() => dispatch('edit')}
              class="flex w-full items-center gap-2 px-3 py-2.5 text-left text-graphite transition-colors hover:bg-black/[0.04] dark:text-dark-text dark:hover:bg-white/[0.06]"
            >
              <span>✏️</span>
              <span>{$t('actions.edit')}</span>
            </button>
            {#if gift.status !== 'gifted'}
              <button
                on:click={() => dispatch('gifted')}
                disabled={loading}
                class="flex w-full items-center gap-2 px-3 py-2.5 text-left text-graphite transition-colors hover:bg-black/[0.04] disabled:cursor-not-allowed disabled:opacity-50 dark:text-dark-text dark:hover:bg-white/[0.06]"
              >
                <span>✅</span>
                <span>{$t('actions.markGifted')}</span>
              </button>
            {/if}
            <button
              on:click={() => dispatch('delete')}
              class="flex w-full items-center gap-2 px-3 py-2.5 text-left text-red-600 transition-colors hover:bg-red-500/10 dark:text-red-300"
            >
              <span>🗑️</span>
              <span>{$t('actions.delete')}</span>
            </button>
          </div>
        </details>
      </div>
    </div>
  {:else if gift.status === 'available'}
    <div class="px-5 pt-3 pb-5 border-t border-black/[0.08] dark:border-white/[0.08]">
      <div class="mb-3 flex items-center justify-between gap-3">
        <div
          role="button"
          tabindex="0"
          class="min-w-0 cursor-pointer"
          on:click={() => dispatch('view')}
          on:keydown={handleKeydown}
          aria-label="View details for {gift.name}"
        >
          {#if hasPrice}
            <span
              class="font-mono {designSystem.text.lg} {designSystem.color.status.available
                .text} {designSystem.color.status.available.textDark}"
            >
              {gift.price_display || $formatPrice(gift.price)}
            </span>
          {:else}
            <span class="{designSystem.text.sm} text-black/35 dark:text-white/35">
              {$t('giftCard.noPrice')}
            </span>
          {/if}
        </div>

        {#if gift.link}
          <a
            href={gift.link}
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex h-9 flex-shrink-0 items-center justify-center gap-2 rounded-full border {designSystem
              .color.neutral.border.DEFAULT} bg-transparent {designSystem.color.neutral.text
              .muted} px-3 text-xs font-medium transition-all duration-200 hover:border-black/20 hover:bg-black/5 active:scale-95 dark:border-white/[0.08] dark:hover:border-white/20 dark:hover:bg-white/5"
            title={$t('actions.openLink')}
          >
            <span>🔗</span>
            <span>{$t('actions.openLink')}</span>
          </a>
        {/if}
      </div>

      <div class="flex items-center gap-2">
        <button
          on:click={handleReserve}
          disabled={loading}
          class="flex-1 min-w-[fit-content] whitespace-nowrap py-2.5 px-4 rounded-full font-medium {designSystem
            .color.primary.bg} {designSystem.color.primary.bgDark} {designSystem.color.primary
            .text} {designSystem.color.primary.textDark} {designSystem.color.primary
            .hover} {designSystem.color.primary
            .hoverDark} shadow-editorial disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:shadow-editorial-lg hover:-translate-y-0.5 active:translate-y-0"
        >
          <span class="flex items-center justify-center gap-2">
            🎁 {$t('actions.reserve')}
          </span>
        </button>
      </div>
    </div>
  {:else if !isOwner && gift.status === 'reserved'}
    <div class="px-5 pt-3 pb-5 border-t border-black/[0.08] dark:border-white/[0.08]">
      <div class="mb-3 flex items-center justify-between gap-3">
        <div>
          {#if hasPrice}
            <span class="font-mono {designSystem.text.lg} text-black/45 dark:text-white/45">
              {gift.price_display || $formatPrice(gift.price)}
            </span>
          {:else}
            <span class="{designSystem.text.sm} text-black/35 dark:text-white/35">
              {$t('giftCard.noPrice')}
            </span>
          {/if}
        </div>

        {#if gift.link}
          <a
            href={gift.link}
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex h-9 flex-shrink-0 items-center justify-center gap-2 rounded-full border {designSystem
              .color.neutral.border.DEFAULT} bg-transparent {designSystem.color.neutral.text
              .muted} px-3 text-xs font-medium transition-all duration-200 hover:border-black/20 hover:bg-black/5 active:scale-95 dark:border-white/[0.08] dark:hover:border-white/20 dark:hover:bg-white/5"
            title={$t('actions.openLink')}
          >
            <span>🔗</span>
            <span>{$t('actions.openLink')}</span>
          </a>
        {/if}
      </div>

      <div class="flex flex-wrap gap-2">
        <button
          on:click={handleReserve}
          disabled={loading}
          class="flex-1 min-w-[11rem] whitespace-nowrap py-2 px-4 rounded-full font-medium {designSystem
            .color.secondary.bg} {designSystem.color.secondary.bgDark} {designSystem.color.secondary
            .text} {designSystem.color.secondary.textDark} {designSystem.color.secondary
            .hover} {designSystem.color.secondary.hoverDark} border {designSystem.color.neutral
            .border
            .DEFAULT} dark:border-white/[0.08] shadow-editorial disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:shadow-editorial-lg hover:-translate-y-0.5 active:translate-y-0"
        >
          <span class="flex items-center justify-center gap-2">
            ✅ {$t('actions.markPurchased')}
          </span>
        </button>
        <button
          on:click={handleUnreserve}
          disabled={loading}
          class="min-w-[fit-content] whitespace-nowrap py-2 px-4 rounded-full font-medium {designSystem
            .color.secondary.bg} {designSystem.color.secondary.bgDark} {designSystem.color.secondary
            .text} {designSystem.color.secondary.textDark} {designSystem.color.secondary
            .hover} {designSystem.color.secondary.hoverDark} border {designSystem.color.neutral
            .border
            .DEFAULT} dark:border-white/[0.08] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0"
        >
          <span class="flex items-center justify-center gap-2">
            🚫 {$t('actions.unreserve')}
          </span>
        </button>
      </div>
    </div>
  {:else if !isOwner && gift.status === 'purchased'}
    <div class="px-5 pt-3 pb-5 border-t border-black/[0.08] dark:border-white/[0.08]">
      <div class="mb-3 flex items-center justify-between gap-3">
        <div>
          {#if hasPrice}
            <span class="font-mono {designSystem.text.lg} text-black/45 dark:text-white/45">
              {gift.price_display || $formatPrice(gift.price)}
            </span>
          {:else}
            <span class="{designSystem.text.sm} text-black/35 dark:text-white/35">
              {$t('giftCard.noPrice')}
            </span>
          {/if}
        </div>

        {#if gift.link}
          <a
            href={gift.link}
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex h-9 flex-shrink-0 items-center justify-center gap-2 rounded-full border {designSystem
              .color.neutral.border.DEFAULT} bg-transparent {designSystem.color.neutral.text
              .muted} px-3 text-xs font-medium transition-all duration-200 hover:border-black/20 hover:bg-black/5 active:scale-95 dark:border-white/[0.08] dark:hover:border-white/20 dark:hover:bg-white/5"
            title={$t('actions.openLink')}
          >
            <span>🔗</span>
            <span>{$t('actions.openLink')}</span>
          </a>
        {/if}
      </div>

      <button
        on:click={handleUnreserve}
        disabled={loading}
        class="w-full min-w-[fit-content] whitespace-nowrap py-2 px-4 rounded-full font-medium {designSystem
          .color.secondary.bg} {designSystem.color.secondary.bgDark} {designSystem.color.secondary
          .text} {designSystem.color.secondary.textDark} {designSystem.color.secondary
          .hover} {designSystem.color.secondary.hoverDark} border {designSystem.color.neutral.border
          .DEFAULT} dark:border-white/[0.08] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0"
      >
        <span class="flex items-center justify-center gap-2">
          🔄 {$t('actions.unreserve')}
        </span>
      </button>
    </div>
  {:else if gift.status === 'gifted'}
    <!-- No actions for gifted gifts -->
  {/if}
</article>

<style>
  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .gift-card {
    animation: card-appear 0.5s ease-out backwards;
  }

  .owner-card-menu summary::-webkit-details-marker {
    display: none;
  }

  @keyframes card-appear {
    from {
      opacity: 0;
      transform: translateY(30px) scale(0.95);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }
</style>
