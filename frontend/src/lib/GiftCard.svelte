<script>
  import { createEventDispatcher } from 'svelte';
  import { fade, fly } from 'svelte/transition';
  import { quintOut } from 'svelte/easing';
  import { t, formatPrice } from './utils/i18n.js';
  import { designSystem, getPriorityColors } from './utils/design-system.js';

  export let gift;
  export let index = 0;
  export let isLarge = false;
  export let isOwner = false;
  export let userSlug = null;

  const dispatch = createEventDispatcher();

  let imageError = false;
  let error = '';
  let loading = false;
  let hovered = false;

  function handleCardClick(e) {
    if (e.target.closest('button') || e.target.closest('a')) return;
    dispatch('view');
  }

  $: currentPriorityCode = gift.priority_code || 'medium';
  $: priorityColorClasses = getPriorityColors(currentPriorityCode);

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

  $: status = (() => {
    switch (gift.status) {
      case 'reserved':
        return {
          text: `🔒 ${$t('status.reserved')}`,
          dotClass: 'bg-amber-500',
          textClass: 'text-amber-700 dark:text-amber-300',
          bgClass: 'bg-amber-500/10',
          borderClass: 'border-amber-500/30'
        };
      case 'purchased':
        return {
          text: `✅ ${$t('status.purchased')}`,
          dotClass: 'bg-blue-500',
          textClass: 'text-blue-700 dark:text-blue-300',
          bgClass: 'bg-blue-500/10',
          borderClass: 'border-blue-500/30'
        };
      case 'gifted':
        return {
          text: `🎉 ${$t('status.gifted')}`,
          dotClass: 'bg-violet-500',
          textClass: 'text-violet-700 dark:text-violet-300',
          bgClass: 'bg-violet-500/10',
          borderClass: 'border-violet-500/30'
        };
      default:
        return { text: '', dotClass: '', textClass: '', bgClass: '', borderClass: '' };
    }
  })();
</script>

<article
  class="gift-card group relative flex flex-col rounded-[12px] overflow-hidden border transition-all duration-300 ease-out {gift.status ===
  'available'
    ? 'bg-ivory dark:bg-dark-bg border-black/[0.08] dark:border-white/[0.08] hover:border-indigo-400/50 dark:hover:border-indigo-500/30 hover:shadow-editorial-lg hover:-translate-y-1 ring-1 ring-inset ring-black/5 dark:ring-white/5'
    : 'bg-surface-hover dark:bg-[#15171A] border-black/[0.06] dark:border-white/[0.06] opacity-75'}"
  on:mouseenter={() => (hovered = true)}
  on:mouseleave={() => (hovered = false)}
  in:fly={{ y: 50, opacity: 0, duration: 400, delay: index * 50, easing: quintOut }}
>
  <!-- Image -->
  <div
    role="button"
    tabindex="0"
    class="relative {isLarge ? 'h-56' : 'h-40'} overflow-hidden bg-[#f4f4f5] dark:bg-white/5 flex-shrink-0 cursor-pointer"
    on:click={() => dispatch('view')}
    on:keydown={handleKeydown}
    aria-label="View details for {gift.name}"
  >
    {#if gift.image_url && !imageError}
      <img
        src={gift.image_url}
        alt={gift.name}
        class="w-full h-full object-contain transition-transform duration-500 ease-out {hovered ? 'scale-110' : 'scale-100'}"
        on:error={() => (imageError = true)}
      />
    {:else}
      <div class="w-full h-full flex items-center justify-center {designSystem.text['4xl']} opacity-30 transition-transform duration-500 ease-out {hovered ? 'scale-110 rotate-5' : 'scale-100'}">
        🎁
      </div>
    {/if}

    {#if status.text}
      <div class="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm transition-opacity duration-300" transition:fade={{ duration: 200 }}>
        <div class="flex items-center gap-2 px-4 py-2 rounded-lg {designSystem.text.sm} {designSystem.text.weight.medium} border-2 {status.bgClass} {status.borderClass} transform transition-transform duration-300 hover:scale-105">
          {#if status.dotClass}
            <span class="w-1.5 h-1.5 rounded-full {status.dotClass}"></span>
          {/if}
          <span class="{status.textClass}">{status.text}</span>
        </div>
      </div>
    {/if}

    {#if gift.status === 'available' && currentPriorityCode === 'hot'}
      <div class="absolute top-2 right-2 w-3 h-3 rounded-full bg-red-500 animate-pulse shadow-lg shadow-red-500/50"></div>
    {/if}
  </div>

  <!-- Content -->
  <div
    role="button"
    tabindex="0"
    class="p-5 flex flex-col flex-1 backdrop-blur-sm cursor-pointer gap-3 {gift.status !== 'available' ? 'grayscale opacity-80' : ''}"
    on:click={() => dispatch('view')}
    on:keydown={handleKeydown}
    aria-label="View details for {gift.name}"
  >
    {#if error}
      <div class="bg-red-500/10 border border-red-500/20 rounded-none px-3 py-2 {designSystem.text.xs} text-red-600 dark:text-red-300 flex items-center gap-2 flex-shrink-0" transition:fade={{ duration: 200 }}>
        <span>⚠️</span><span>{error}</span>
      </div>
    {/if}

    <div class="flex gap-2 flex-wrap flex-shrink-0">
      {#if gift.category_code}
        <span class="px-3 py-1 rounded-none {designSystem.text.xs} {designSystem.badge.category}">
          {$t(`categories.${gift.category_code}`)}
        </span>
      {/if}
      <span class="px-3 py-1 rounded-none {designSystem.badge.priority} {priorityColorClasses.bg} {priorityColorClasses.bgDark} {priorityColorClasses.text} {priorityColorClasses.textDark} border {priorityColorClasses.border} {priorityColorClasses.borderDark}">
        {$t(`priorities.${currentPriorityCode}`)}
      </span>
    </div>

    <h3 class="{isLarge ? designSystem.text.xl : designSystem.text.base} text-graphite dark:text-dark-text leading-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors duration-200 flex-shrink-0">
      {gift.name}
    </h3>

    {#if gift.description}
      <p class="{designSystem.color.neutral.text.muted} {designSystem.color.neutral.text.mutedDark} {designSystem.text.base} line-clamp-2 {designSystem.text.leading.relaxed} flex-shrink-0">
        {gift.description}
      </p>
    {/if}

    <div class="flex-1 min-h-0"></div>
  </div>

  <!-- Price -->
  {#if gift.price_display || gift.price}
    <div
      role="button"
      tabindex="0"
      class="px-5 pt-3 pb-2 border-t border-black/[0.08] dark:border-white/[0.08] cursor-pointer"
      on:click={() => dispatch('view')}
      on:keydown={handleKeydown}
      aria-label="View details for {gift.name}"
    >
      <span class="font-mono {designSystem.text.lg} {designSystem.color.status.available.text} {designSystem.color.status.available.textDark}">
        {gift.price_display || $formatPrice(gift.price)}
      </span>
    </div>
  {/if}

  <!-- Action buttons — only for owner -->
  {#if isOwner}
    <div class="flex items-center justify-end px-5 py-2 border-t border-black/[0.08] dark:border-white/[0.08]">
      <div class="flex gap-2">
        {#if gift.link}
          <a
            href={gift.link}
            target="_blank"
            rel="noopener noreferrer"
            class="w-11 h-11 min-w-[fit-content] rounded-full bg-transparent border {designSystem.color.neutral.border.DEFAULT} dark:border-white/[0.08] {designSystem.color.neutral.text.muted} {designSystem.color.neutral.text.mutedDark} hover:bg-black/5 dark:hover:bg-white/5 hover:border-black/20 dark:hover:border-white/20 flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95"
            title={$t('actions.openLink')}
          >
            🔗
          </a>
        {/if}
        <button
          on:click={() => dispatch('edit')}
          class="w-11 h-11 min-w-[fit-content] rounded-full bg-transparent border {designSystem.color.neutral.border.DEFAULT} dark:border-white/[0.08] {designSystem.color.neutral.text.muted} {designSystem.color.neutral.text.mutedDark} hover:bg-black/5 dark:hover:bg-white/5 hover:border-black/20 dark:hover:border-white/20 flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95"
          title={$t('actions.edit')}
        >
          ✏️
        </button>
        <button
          on:click={() => dispatch('delete')}
          class="w-11 h-11 min-w-[fit-content] rounded-full bg-transparent border {designSystem.color.neutral.border.DEFAULT} dark:border-white/[0.08] {designSystem.color.neutral.text.muted} {designSystem.color.neutral.text.mutedDark} hover:bg-black/5 dark:hover:bg-white/5 hover:border-black/20 dark:hover:border-white/20 flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95"
          title={$t('actions.delete')}
        >
          🗑️
        </button>
      </div>
    </div>
  {:else if gift.link}
    <!-- Guest: only show link button -->
    <div class="flex items-center justify-end px-5 py-2 border-t border-black/[0.08] dark:border-white/[0.08]">
      <a
        href={gift.link}
        target="_blank"
        rel="noopener noreferrer"
        class="w-11 h-11 min-w-[fit-content] rounded-full bg-transparent border {designSystem.color.neutral.border.DEFAULT} dark:border-white/[0.08] {designSystem.color.neutral.text.muted} {designSystem.color.neutral.text.mutedDark} hover:bg-black/5 dark:hover:bg-white/5 hover:border-black/20 dark:hover:border-white/20 flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95"
        title={$t('actions.openLink')}
      >
        🔗
      </a>
    </div>
  {/if}

  <!-- Reserve / Purchased / Unreserve buttons — visible to everyone -->
  {#if gift.status === 'available'}
    <div class="px-5 pt-3 pb-5">
      <div class="flex gap-2">
        <button
          on:click={handleReserve}
          disabled={loading}
          class="flex-1 min-w-[fit-content] whitespace-nowrap py-2.5 px-4 rounded-full font-medium {designSystem.color.primary.bg} {designSystem.color.primary.bgDark} {designSystem.color.primary.text} {designSystem.color.primary.textDark} {designSystem.color.primary.hover} {designSystem.color.primary.hoverDark} shadow-editorial disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:shadow-editorial-lg hover:-translate-y-0.5 active:translate-y-0"
        >
          <span class="flex items-center justify-center gap-2">
            🎁 {$t('actions.reserve')}
          </span>
        </button>
        {#if isOwner}
          <button
            on:click={() => dispatch('gifted')}
            disabled={loading}
            class="min-w-[fit-content] whitespace-nowrap py-2.5 px-4 rounded-full font-medium bg-violet-600 hover:bg-violet-700 text-white shadow-editorial disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:shadow-editorial-lg hover:-translate-y-0.5 active:translate-y-0"
            title={$t('actions.markGifted')}
          >
            🎉
          </button>
        {/if}
      </div>
    </div>
  {:else if gift.status === 'reserved'}
    <div class="px-5 pt-3 pb-5">
      <div class="flex gap-2">
        <button
          on:click={handleReserve}
          disabled={loading}
          class="min-w-[fit-content] whitespace-nowrap py-2 px-4 rounded-full font-medium {designSystem.color.secondary.bg} {designSystem.color.secondary.bgDark} {designSystem.color.secondary.text} {designSystem.color.secondary.textDark} {designSystem.color.secondary.hover} {designSystem.color.secondary.hoverDark} border {designSystem.color.neutral.border.DEFAULT} dark:border-white/[0.08] shadow-editorial disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:shadow-editorial-lg hover:-translate-y-0.5 active:translate-y-0"
        >
          <span class="flex items-center justify-center gap-2">
            ✅ {$t('actions.markPurchased')}
          </span>
        </button>
        {#if isOwner}
          <button
            on:click={() => dispatch('gifted')}
            disabled={loading}
            class="min-w-[fit-content] whitespace-nowrap py-2 px-4 rounded-full font-medium bg-violet-600 hover:bg-violet-700 text-white shadow-editorial disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:shadow-editorial-lg hover:-translate-y-0.5 active:translate-y-0"
            title={$t('actions.markGifted')}
          >
            🎉
          </button>
        {/if}
        <button
          on:click={handleUnreserve}
          disabled={loading}
          class="min-w-[fit-content] whitespace-nowrap py-2 px-4 rounded-full font-medium {designSystem.color.secondary.bg} {designSystem.color.secondary.bgDark} {designSystem.color.secondary.text} {designSystem.color.secondary.textDark} {designSystem.color.secondary.hover} {designSystem.color.secondary.hoverDark} border {designSystem.color.neutral.border.DEFAULT} dark:border-white/[0.08] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0"
        >
          <span class="flex items-center justify-center gap-2">
            🚫 {$t('actions.unreserve')}
          </span>
        </button>
      </div>
    </div>
  {:else if gift.status === 'purchased'}
    <div class="px-5 pt-3 pb-5">
      <div class="flex gap-2">
        {#if isOwner}
          <button
            on:click={() => dispatch('gifted')}
            disabled={loading}
            class="flex-1 min-w-[fit-content] whitespace-nowrap py-2 px-4 rounded-full font-medium bg-violet-600 hover:bg-violet-700 text-white shadow-editorial disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:shadow-editorial-lg hover:-translate-y-0.5 active:translate-y-0"
          >
            <span class="flex items-center justify-center gap-2">
              🎉 {$t('actions.markGifted')}
            </span>
          </button>
        {/if}
        <button
          on:click={handleUnreserve}
          disabled={loading}
          class="min-w-[fit-content] whitespace-nowrap py-2 px-4 rounded-full font-medium {designSystem.color.secondary.bg} {designSystem.color.secondary.bgDark} {designSystem.color.secondary.text} {designSystem.color.secondary.textDark} {designSystem.color.secondary.hover} {designSystem.color.secondary.hoverDark} border {designSystem.color.neutral.border.DEFAULT} dark:border-white/[0.08] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0"
        >
          <span class="flex items-center justify-center gap-2">
            🔄 {$t('actions.unreserve')}
          </span>
        </button>
      </div>
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
