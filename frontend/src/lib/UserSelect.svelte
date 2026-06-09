<script>
  import { createEventDispatcher } from 'svelte';
  import { fly } from 'svelte/transition';
  import { quintOut } from 'svelte/easing';
  import { t } from './utils/i18n.js';

  export let users = [];
  export let loading = false;

  const dispatch = createEventDispatcher();

  const serviceCards = [
    {
      icon: '🎁',
      title: 'users.service.givers.title',
      body: 'users.service.givers.body',
    },
    {
      icon: '📝',
      title: 'users.service.owners.title',
      body: 'users.service.owners.body',
    },
    {
      icon: '🔐',
      title: 'users.service.privacy.title',
      body: 'users.service.privacy.body',
    },
  ];

  const featureCards = [
    {
      label: 'users.features.links.label',
      text: 'users.features.links.text',
    },
    {
      label: 'users.features.ai.label',
      text: 'users.features.ai.text',
    },
  ];

  function selectUser(user) {
    dispatch('select', user);
  }
</script>

<section class="mx-auto flex w-full flex-col gap-7 px-1 pb-10 pt-2 sm:gap-9 sm:px-2 sm:pb-14 sm:pt-5" style="max-width: 72rem;">
  <div class="rounded-[8px] border border-black/[0.08] bg-white/70 p-4 shadow-editorial dark:border-white/[0.08] dark:bg-white/[0.03] sm:p-6">
    <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div class="w-full min-w-0 flex-1">
        <p class="mb-2 text-xs font-semibold text-indigo-600 dark:text-indigo-300">
          {$t('users.kicker')}
        </p>
        <h1 class="text-4xl font-medium text-graphite dark:text-dark-text">
          {$t('users.title')}
        </h1>
        <p class="mt-3 w-full text-sm leading-relaxed text-black/60 dark:text-white/60" style="max-width: 42rem;">
          {$t('users.subtitle')}
        </p>
      </div>
      <div class="w-full rounded-[8px] border border-black/[0.08] bg-ivory/80 p-4 text-sm text-black/60 dark:border-white/[0.08] dark:bg-dark-bg/80 dark:text-white/60 lg:w-80 lg:flex-shrink-0">
        <p class="font-medium text-graphite dark:text-dark-text">{$t('users.guestNote.title')}</p>
        <p class="mt-1 leading-relaxed">{$t('users.guestNote.body')}</p>
      </div>
    </div>

    {#if loading}
      <div class="flex items-center justify-center py-14">
        <div class="text-center">
          <div
            class="mb-4 inline-block h-12 w-12 animate-spin rounded-full border-[3px] border-indigo-500 border-t-transparent"
          ></div>
          <p class="text-black/40 dark:text-white/40">{$t('app.loading')}</p>
        </div>
      </div>
    {:else if users.length === 0}
      <div class="mt-8 rounded-[8px] border border-dashed border-black/[0.14] bg-ivory/70 px-5 py-10 text-center dark:border-white/[0.14] dark:bg-dark-bg/70">
        <div class="mb-4 text-6xl opacity-25">👤</div>
        <h2 class="mb-2 text-xl font-medium text-black/40 dark:text-white/40">
          {$t('users.noUsers')}
        </h2>
        <p class="mx-auto w-full text-sm leading-relaxed text-black/55 dark:text-white/55" style="max-width: 28rem;">
          {$t('users.noUsersDescription')}
        </p>
      </div>
    {:else}
      <div class="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {#each users as user, index (user.id)}
          <button
            type="button"
            on:click={() => selectUser(user)}
            class="group flex min-h-[148px] flex-col justify-between rounded-[8px] border border-black/[0.08] bg-ivory p-5 text-left shadow-editorial transition-all duration-300 hover:-translate-y-0.5 hover:border-indigo-500/40 hover:shadow-editorial-lg active:translate-y-0 dark:border-white/[0.08] dark:bg-dark-bg"
            transition:fly={{ y: 24, duration: 260, delay: index * 80, easing: quintOut }}
            aria-label={$t('users.openWishlistFor', { name: user.name })}
          >
            <span class="mb-5 flex items-start justify-between gap-3">
              <span class="text-5xl leading-none">{user.avatar_emoji || '🎁'}</span>
              <span class="rounded-full border border-black/[0.08] px-3 py-1 text-xs font-medium text-black/50 transition-colors group-hover:border-indigo-500/30 group-hover:text-indigo-600 dark:border-white/[0.08] dark:text-white/50 dark:group-hover:text-indigo-300">
                {$t('users.openWishlist')}
              </span>
            </span>
            <span>
              <span class="block text-2xl font-medium text-graphite dark:text-dark-text">
                {user.name}
              </span>
              <span class="mt-1 block text-sm text-black/45 dark:text-white/45">/{user.slug}</span>
            </span>
          </button>
        {/each}
      </div>
    {/if}
  </div>

  <div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
    {#each serviceCards as card (card.title)}
      <article class="rounded-[8px] border border-black/[0.08] bg-white/70 p-5 shadow-editorial dark:border-white/[0.08] dark:bg-white/[0.03]">
        <div class="mb-4 text-3xl">{card.icon}</div>
        <h2 class="text-lg font-medium text-graphite dark:text-dark-text">
          {$t(card.title)}
        </h2>
        <p class="mt-2 text-sm leading-relaxed text-black/60 dark:text-white/60">
          {$t(card.body)}
        </p>
      </article>
    {/each}
  </div>

  <div class="grid grid-cols-1 gap-4 lg:grid-cols-[1.1fr_0.9fr]">
    <section class="rounded-[8px] border border-black/[0.08] bg-white/70 p-5 shadow-editorial dark:border-white/[0.08] dark:bg-white/[0.03] sm:p-6">
      <p class="mb-2 text-xs font-semibold text-indigo-600 dark:text-indigo-300">
        {$t('users.howItWorks.kicker')}
      </p>
      <h2 class="text-2xl font-medium text-graphite dark:text-dark-text">
        {$t('users.howItWorks.title')}
      </h2>
      <div class="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div class="rounded-[8px] bg-ivory p-4 dark:bg-dark-bg">
          <p class="text-sm font-medium text-graphite dark:text-dark-text">{$t('users.howItWorks.step1.title')}</p>
          <p class="mt-1 text-sm leading-relaxed text-black/55 dark:text-white/55">{$t('users.howItWorks.step1.body')}</p>
        </div>
        <div class="rounded-[8px] bg-ivory p-4 dark:bg-dark-bg">
          <p class="text-sm font-medium text-graphite dark:text-dark-text">{$t('users.howItWorks.step2.title')}</p>
          <p class="mt-1 text-sm leading-relaxed text-black/55 dark:text-white/55">{$t('users.howItWorks.step2.body')}</p>
        </div>
        <div class="rounded-[8px] bg-ivory p-4 dark:bg-dark-bg">
          <p class="text-sm font-medium text-graphite dark:text-dark-text">{$t('users.howItWorks.step3.title')}</p>
          <p class="mt-1 text-sm leading-relaxed text-black/55 dark:text-white/55">{$t('users.howItWorks.step3.body')}</p>
        </div>
      </div>
    </section>

    <aside class="rounded-[8px] border border-black/[0.08] bg-graphite p-5 text-white shadow-editorial dark:border-white/[0.10] dark:bg-[#b9aea1] dark:text-graphite sm:p-6">
      <p class="mb-2 text-xs font-semibold text-white/60 dark:text-black/50">
        {$t('users.join.kicker')}
      </p>
      <h2 class="text-2xl font-medium">{$t('users.join.title')}</h2>
      <p class="mt-3 text-sm leading-relaxed text-white/70 dark:text-black/60">
        {$t('users.join.body')}
      </p>
    </aside>
  </div>

  <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
    {#each featureCards as card (card.label)}
      <div class="rounded-[8px] border border-black/[0.08] bg-white/60 p-5 dark:border-white/[0.08] dark:bg-white/[0.03]">
        <p class="text-sm font-medium text-graphite dark:text-dark-text">{$t(card.label)}</p>
        <p class="mt-2 text-sm leading-relaxed text-black/60 dark:text-white/60">{$t(card.text)}</p>
      </div>
    {/each}
  </div>
</section>
