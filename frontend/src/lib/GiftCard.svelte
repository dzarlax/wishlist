<script>
  import { createEventDispatcher } from 'svelte';
  import { fade, fly } from 'svelte/transition';
  import { quintOut } from 'svelte/easing';
  import { t, formatPrice } from './utils/i18n.js';

  export let gift;
  export let index = 0;

  const dispatch = createEventDispatcher();

  let imageError = false;
  let error = '';
  let loading = false;
  let hovered = false;

  // Get priority code from gift (with fallback)
  $: currentPriorityCode = (() => {
    if (gift.priority_code) return gift.priority_code;
    const priorityMapping = $t('priorityMapping');
    return priorityMapping[gift.priority] || 'medium';
  })();

  async function handleReserve() {
    error = '';
    loading = true;

    if (gift.status === 'available') {
      loading = false;
      dispatch('reserve');
    } else if (gift.status === 'reserved') {
      const secretCode = prompt($t('modals.markPurchased.prompt'));
      if (!secretCode) {
        loading = false;
        return;
      }

      try {
        const response = await fetch(`/api/gifts/${gift.id}/purchased`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ secret_code: secretCode })
        });

        if (!response.ok) {
          const err = await response.json();
          error = err.error || $t('toasts.error');
          loading = false;
          return;
        }

        dispatch('refresh');
      } catch (err) {
        error = $t('toasts.error');
        loading = false;
      }
    }
  }

  async function handleUnreserve() {
    error = '';
    loading = true;

    const secretCode = prompt($t('modals.unreserve.prompt'));
    if (!secretCode) {
      loading = false;
      return;
    }

    try {
      const response = await fetch(`/api/gifts/${gift.id}/unreserve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret_code: secretCode })
      });

      if (!response.ok) {
        const err = await response.json();
        error = err.error || $t('toasts.error');
        loading = false;
        return;
      }

      dispatch('refresh');
    } catch (err) {
      error = $t('toasts.error');
      loading = false;
    }
  }

  function getStatusBadge() {
    switch (gift.status) {
      case 'reserved':
        return { text: `🔒 ${$t('status.reserved')}`, class: 'bg-amber-500/90 text-white border-amber-400 shadow-lg shadow-amber-500/20' };
      case 'purchased':
        return { text: `✅ ${$t('status.purchased')}`, class: 'bg-emerald-600/90 text-white border-emerald-500 shadow-lg shadow-emerald-500/20' };
      default:
        return { text: '', class: '' };
    }
  }

  $: status = getStatusBadge();
</script>

<article
  class="gift-card group relative flex flex-col rounded-xl overflow-hidden border transition-all duration-300 ease-out {gift.status === 'available'
    ? 'bg-gradient-to-br from-white to-slate-50 dark:from-slate-900/95 dark:to-slate-800/95 border-slate-300 dark:border-slate-700/50 hover:border-indigo-400 dark:hover:border-indigo-500/50 hover:shadow-xl hover:shadow-indigo-500/10 hover:-translate-y-1'
    : 'bg-slate-100 dark:bg-slate-900/80 border-slate-300 dark:border-slate-800/50 opacity-75'}"
  on:mouseenter={() => hovered = true}
  on:mouseleave={() => hovered = false}
  in:fly={{ y: 50, opacity: 0, duration: 400, delay: index * 50, easing: quintOut }}
>
  <!-- Image -->
  <div class="relative h-40 overflow-hidden bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-800 dark:to-slate-900 flex-shrink-0">
    {#if gift.image_url && !imageError}
      <img
        src={gift.image_url}
        alt={gift.name}
        class="w-full h-full object-cover transition-transform duration-500 ease-out {hovered ? 'scale-110' : 'scale-100'}"
        on:error={() => imageError = true}
      />
    {:else}
      <div class="w-full h-full flex items-center justify-center text-5xl opacity-30 transition-transform duration-500 ease-out {hovered ? 'scale-110 rotate-5' : 'scale-100'}">
        🎁
      </div>
    {/if}

    {#if status.text}
      <div class="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-md transition-opacity duration-300" transition:fade={{ duration: 200 }}>
        <div class="px-4 py-2 rounded-lg text-base font-bold border-2 {status.class} transform transition-transform duration-300 hover:scale-105">
          {status.text}
        </div>
      </div>
    {/if}

    {#if gift.status === 'available' && currentPriorityCode === 'hot'}
      <div class="absolute top-2 right-2 w-3 h-3 rounded-full bg-red-500 animate-pulse shadow-lg shadow-red-500/50"></div>
    {/if}
  </div>

  <!-- Content -->
  <div class="p-4 space-y-3 flex flex-col flex-1 backdrop-blur-sm">
    {#if error}
      <div
        class="bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 text-xs text-red-600 dark:text-red-300 flex items-center gap-2"
        transition:fade={{ duration: 200 }}
      >
        <span>⚠️</span>
        <span>{error}</span>
      </div>
    {/if}

    <div class="flex gap-2 flex-wrap">
      {#if gift.category_code}
        <span class="px-2.5 py-1 rounded-lg text-xs text-slate-700 dark:text-slate-300 bg-slate-200 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700/50 backdrop-blur-sm">
          {$t(`categories.${gift.category_code}`)}
        </span>
      {/if}
      <span class="px-2.5 py-1 rounded-lg text-xs {currentPriorityCode === 'hot'
        ? 'text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/30 border-red-200 dark:border-red-800/50'
        : currentPriorityCode === 'medium'
        ? 'text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800/50'
        : 'text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800/50'} backdrop-blur-sm">
        {$t(`priorities.${currentPriorityCode}`)}
      </span>
    </div>

    <h3 class="text-base font-semibold text-slate-900 dark:text-white leading-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors duration-200">
      {gift.name}
    </h3>

    {#if gift.description}
      <p class="text-slate-600 dark:text-slate-400 text-sm line-clamp-2 leading-relaxed">
        {gift.description}
      </p>
    {/if}

    <div class="flex-1"></div>

    <div class="flex items-center justify-between pt-2 border-t border-slate-300 dark:border-slate-700/50">
      {#if gift.price}
        <span class="text-lg font-bold bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-emerald-400 dark:to-teal-400 bg-clip-text text-transparent">
          {$formatPrice(gift.price)}
        </span>
      {:else}
        <span></span>
      {/if}

      <div class="flex gap-2">
        {#if gift.link}
          <a
            href={gift.link}
            target="_blank"
            rel="noopener"
            class="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-800/80 hover:bg-indigo-100 dark:hover:bg-indigo-600/80 border border-slate-300 dark:border-slate-700/50 hover:border-indigo-400 dark:hover:border-indigo-500/50 flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95"
            title="Открыть ссылку"
          >
            🔗
          </a>
        {/if}
        <button
          on:click={() => dispatch('edit')}
          class="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-800/80 hover:bg-amber-100 dark:hover:bg-amber-600/80 border border-slate-300 dark:border-slate-700/50 hover:border-amber-400 dark:hover:border-amber-500/50 flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95"
          title={$t('actions.edit')}
        >
          ✏️
        </button>
        <button
          on:click={() => dispatch('delete')}
          class="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-800/80 hover:bg-red-100 dark:hover:bg-red-600/80 border border-slate-300 dark:border-slate-700/50 hover:border-red-400 dark:hover:border-red-500/50 flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95"
          title={$t('actions.delete')}
        >
          🗑️
        </button>
      </div>
    </div>

    {#if gift.status === 'available'}
      <button
        on:click={handleReserve}
        disabled={loading}
        class="w-full py-2.5 px-4 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 border border-indigo-500/50 shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:shadow-xl hover:shadow-indigo-500/30 hover:-translate-y-0.5 active:translate-y-0"
      >
        {#if loading}
          <span class="flex items-center justify-center gap-2">
            <span class="animate-spin">⏳</span>
            <span>{$t('app.loading')}</span>
          </span>
        {:else}
          {$t('actions.reserve')}
        {/if}
      </button>
    {:else if gift.status === 'reserved'}
      <div class="flex gap-2">
        <button
          on:click={handleReserve}
          disabled={loading}
          class="flex-1 py-2.5 px-3 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 border border-emerald-500/50 shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:shadow-xl hover:shadow-emerald-500/30 hover:-translate-y-0.5 active:translate-y-0"
        >
          {#if loading}
            <span class="flex items-center justify-center gap-2">
              <span class="animate-spin">⏳</span>
              <span>{$t('app.loading')}</span>
            </span>
          {:else}
            ✅ {$t('actions.markPurchased')}
          {/if}
        </button>
        <button
          on:click={handleUnreserve}
          disabled={loading}
          class="flex-1 py-2.5 px-3 rounded-lg text-sm font-semibold text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/40 hover:bg-red-200 dark:hover:bg-red-900/50 border border-red-300 dark:border-red-900/50 hover:border-red-400 dark:hover:border-red-700/70 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0"
        >
          {#if loading}
            <span class="flex items-center justify-center gap-2">
              <span class="animate-spin">⏳</span>
              <span>{$t('app.loading')}</span>
            </span>
          {:else}
            {$t('actions.unreserve')}
          {/if}
        </button>
      </div>
    {:else if gift.status === 'purchased'}
      <button
        on:click={handleUnreserve}
        disabled={loading}
        class="w-full py-2.5 px-4 rounded-lg text-sm font-semibold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/40 hover:bg-amber-200 dark:hover:bg-amber-900/50 border border-amber-300 dark:border-amber-900/50 hover:border-amber-400 dark:hover:border-amber-700/70 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0"
      >
        {#if loading}
          <span class="flex items-center justify-center gap-2">
            <span class="animate-spin">⏳</span>
            <span>{$t('app.loading')}</span>
          </span>
        {:else}
          {$t('actions.unreserve')}
        {/if}
      </button>
    {/if}
  </div>
</article>

<style>
  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
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

  .gift-card::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    padding: 1px;
    background: linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(168, 85, 247, 0.1));
    -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    opacity: 0;
    transition: opacity 0.3s ease;
    pointer-events: none;
  }

  .gift-card:hover::before {
    opacity: 1;
  }
</style>
