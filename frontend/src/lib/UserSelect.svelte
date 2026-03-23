<script>
  import { createEventDispatcher } from 'svelte';
  import { scale, fly } from 'svelte/transition';
  import { quintOut } from 'svelte/easing';
  import { t } from './utils/i18n.js';
  import { designSystem } from './utils/design-system.js';

  export let users = [];
  export let loading = false;

  const dispatch = createEventDispatcher();

  function selectUser(user) {
    dispatch('select', user);
  }
</script>

<div class="flex flex-col items-center justify-center min-h-[60vh] px-4">
  <div class="text-center mb-10">
    <h1
      class="text-4xl sm:text-5xl font-medium tracking-tighter text-graphite dark:text-dark-text mb-3"
      style="letter-spacing: -0.03em;"
    >
      {$t('users.title')}
    </h1>
    <p class="text-black/50 dark:text-white/50 text-sm sm:text-base">
      {$t('users.subtitle')}
    </p>
  </div>

  {#if loading}
    <div class="flex items-center justify-center py-14">
      <div class="text-center">
        <div
          class="inline-block animate-spin rounded-full h-12 w-12 border-[3px] border-indigo-500 border-t-transparent mb-4"
        ></div>
        <p class="text-black/40 dark:text-white/40">{$t('app.loading')}</p>
      </div>
    </div>
  {:else if users.length === 0}
    <div class="text-center py-14">
      <div class="text-6xl mb-4 opacity-20">👤</div>
      <h3 class="text-xl font-medium tracking-tighter text-black/30 dark:text-white/30 mb-2">
        {$t('users.noUsers')}
      </h3>
      <p class="text-black/50 dark:text-white/50 text-sm">
        {$t('users.noUsersDescription')}
      </p>
    </div>
  {:else}
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 w-full max-w-3xl">
      {#each users as user, index (user.id)}
        <button
          on:click={() => selectUser(user)}
          class="group relative bg-white/80 dark:bg-surface-dark/80 backdrop-blur-md border border-black/[0.08] dark:border-white/[0.08] rounded-modal p-6 sm:p-8 shadow-editorial hover:shadow-editorial-lg transition-all duration-300 hover:-translate-y-1 active:translate-y-0 text-left"
          transition:fly={{ y: 30, duration: 300, delay: index * 100, easing: quintOut }}
        >
          <div class="text-5xl sm:text-6xl mb-4">
            {user.avatar_emoji || '🎁'}
          </div>
          <h2 class="text-xl sm:text-2xl font-medium tracking-tighter text-graphite dark:text-dark-text mb-1">
            {user.name}
          </h2>
          <p class="text-xs text-black/40 dark:text-white/40">
            /{user.slug}
          </p>
          <div class="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-black/30 dark:text-white/30">
            →
          </div>
        </button>
      {/each}
    </div>
  {/if}
</div>
