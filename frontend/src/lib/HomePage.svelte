<script>
  import { createEventDispatcher } from 'svelte';
  import { t } from './utils/i18n.js';

  export let loading = false;

  const dispatch = createEventDispatcher();
  let showInviteInfo = false;

  const reasonCards = [
    {
      icon: '🎯',
      title: 'users.privateHome.reasons.noDuplicates.title',
      body: 'users.privateHome.reasons.noDuplicates.body',
    },
    {
      icon: '🤫',
      title: 'users.privateHome.reasons.secret.title',
      body: 'users.privateHome.reasons.secret.body',
    },
    {
      icon: '✨',
      title: 'users.privateHome.reasons.simple.title',
      body: 'users.privateHome.reasons.simple.body',
    },
  ];

  const steps = [
    {
      icon: '🎁',
      title: 'users.privateHome.steps.open.title',
      body: 'users.privateHome.steps.open.body',
    },
    {
      icon: '✅',
      title: 'users.privateHome.steps.reserve.title',
      body: 'users.privateHome.steps.reserve.body',
    },
    {
      icon: '🥂',
      title: 'users.privateHome.steps.celebrate.title',
      body: 'users.privateHome.steps.celebrate.body',
    },
  ];

  const previewGifts = [
    {
      icon: '☕',
      title: 'users.privateHome.mockup.gift1.title',
      meta: 'users.privateHome.mockup.gift1.meta',
      status: 'users.privateHome.mockup.available',
      statusClasses: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-200',
    },
    {
      icon: '🎲',
      title: 'users.privateHome.mockup.gift2.title',
      meta: 'users.privateHome.mockup.gift2.meta',
      status: 'users.privateHome.mockup.reserved',
      statusClasses: 'bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-200',
    },
    {
      icon: '🎟️',
      title: 'users.privateHome.mockup.gift3.title',
      meta: 'users.privateHome.mockup.gift3.meta',
      status: 'users.privateHome.mockup.purchased',
      statusClasses: 'bg-blue-100 text-blue-700 dark:bg-blue-400/15 dark:text-blue-200',
    },
  ];

  const exampleWishlistUrl =
    typeof window === 'undefined'
      ? '#/your-name'
      : `${window.location.origin}${window.location.pathname}#/your-name`;
  const currentYear = new Date().getFullYear();

  function openLogin() {
    showInviteInfo = false;
    dispatch('login');
  }

  function openInviteInfo() {
    showInviteInfo = true;
  }

  function closeInviteInfo() {
    showInviteInfo = false;
  }

  function handleKeydown(event) {
    if (event.key === 'Escape') closeInviteInfo();
  }
</script>

<svelte:window on:keydown={handleKeydown} />

<section
  class="mx-auto flex w-full flex-col gap-5 px-1 pb-10 pt-2 sm:gap-6 sm:px-2 sm:pb-14 sm:pt-5"
  style="max-width: 76rem;"
>
  <div
    class="overflow-hidden rounded-[8px] border border-black/[0.08] bg-white shadow-editorial dark:border-white/[0.08] dark:bg-white/[0.03]"
  >
    <div class="grid grid-cols-1 lg:grid-cols-[1.04fr_0.96fr]">
      <div
        class="flex flex-col justify-center bg-[linear-gradient(135deg,#fffaf0_0%,#fff5f7_48%,#eefcf6_100%)] px-5 py-8 dark:bg-none dark:bg-dark-bg sm:px-7 sm:py-10 lg:px-9 lg:py-12"
      >
        <div>
          <p class="mb-4 text-xs font-semibold uppercase text-indigo-600 dark:text-indigo-300">
            {$t('users.privateHome.kicker')}
          </p>
          <h1
            class="max-w-3xl text-4xl font-medium leading-[1.04] text-graphite dark:text-dark-text sm:text-5xl lg:text-6xl"
          >
            {$t('users.privateHome.title')}
          </h1>
          <p
            class="mt-5 w-full text-base leading-relaxed text-black/60 dark:text-white/60 sm:text-lg"
            style="max-width: 42rem;"
          >
            {$t('users.privateHome.subtitle')}
          </p>
        </div>

        <div class="mt-8 flex flex-col gap-3">
          <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="button"
              on:click={openLogin}
              class="inline-flex h-12 items-center justify-center rounded-full bg-indigo-600 px-6 text-sm font-medium text-white shadow-editorial transition-all duration-200 hover:bg-indigo-500 active:translate-y-px dark:bg-indigo-500 dark:hover:bg-indigo-400"
            >
              {$t('users.privateHome.cta.login')}
            </button>
            <button
              type="button"
              on:click={openInviteInfo}
              class="inline-flex h-12 items-center justify-center rounded-full border border-black/[0.08] bg-white/70 px-6 text-sm font-medium text-graphite shadow-editorial transition-all duration-200 hover:bg-white active:translate-y-px dark:border-white/[0.10] dark:bg-white/[0.05] dark:text-dark-text dark:hover:bg-white/[0.08]"
            >
              {$t('users.privateHome.cta.invite')}
            </button>
          </div>
          <p class="text-sm leading-relaxed text-black/60 dark:text-white/60">
            {$t('users.privateHome.cta.note')}
          </p>
        </div>
      </div>

      <aside
        class="border-t border-black/[0.08] bg-[linear-gradient(135deg,#fff5f7_0%,#fff9ed_52%,#f0fbf5_100%)] p-5 text-graphite dark:border-white/[0.08] dark:bg-none dark:bg-white/[0.03] dark:text-dark-text sm:p-7 lg:border-l lg:border-t-0"
      >
        <div
          class="relative min-h-[390px] overflow-hidden rounded-[8px] border border-rose-200 bg-white/55 p-5 shadow-editorial dark:border-white/[0.08] dark:bg-dark-bg/80"
        >
          <div class="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-amber-200/55"></div>
          <div class="absolute -bottom-14 -left-14 h-36 w-36 rounded-full bg-rose-300/40"></div>
          <div class="absolute left-6 top-6 text-2xl">✨</div>
          <div class="absolute right-8 top-10 text-xl">🎀</div>
          <div class="absolute bottom-8 left-9 text-xl">⭐</div>
          <div class="absolute bottom-10 right-10 text-2xl">🎉</div>

          <div class="relative flex min-h-[350px] w-full flex-col justify-center">
            <div
              class="mx-auto w-full rounded-[8px] border border-black/[0.08] bg-white/92 p-4 shadow-editorial-lg backdrop-blur dark:border-white/[0.08] dark:bg-white/[0.06]"
              style="width: min(100%, 28rem); max-width: 28rem;"
            >
              <div class="flex items-start justify-between gap-4">
                <div>
                  <p class="text-xs font-semibold uppercase text-rose-500 dark:text-rose-200">
                    {$t('users.privateHome.mockup.label')}
                  </p>
                  <h3
                    class="mt-2 text-xl font-medium leading-tight text-graphite dark:text-dark-text"
                  >
                    {$t('users.privateHome.mockup.title')}
                  </h3>
                  <p class="mt-1 text-sm text-black/50 dark:text-white/50">
                    {$t('users.privateHome.mockup.subtitle')}
                  </p>
                </div>
                <div
                  class="flex h-16 w-16 shrink-0 items-center justify-center rounded-[8px] bg-rose-500 text-4xl shadow-editorial"
                >
                  🎁
                </div>
              </div>

              <div
                class="mt-4 flex flex-col gap-2 rounded-[8px] border border-black/[0.06] bg-ivory p-3 dark:border-white/[0.08] dark:bg-black/20"
              >
                <p class="text-xs font-medium uppercase text-black/35 dark:text-white/35">
                  {$t('users.privateHome.mockup.shareLabel')}
                </p>
                <div class="flex items-center gap-2">
                  <div
                    class="min-w-0 flex-1 truncate rounded-[8px] bg-white px-3 py-2 font-mono text-xs text-black/55 dark:bg-white/[0.06] dark:text-white/55"
                  >
                    {exampleWishlistUrl}
                  </div>
                  <div
                    class="rounded-full bg-indigo-600 px-3 py-2 text-xs font-medium text-white dark:bg-indigo-500"
                  >
                    {$t('users.copyWishlistLink')}
                  </div>
                </div>
              </div>

              <div class="mt-4 space-y-2">
                {#each previewGifts as gift (gift.title)}
                  <div
                    class="flex items-center gap-3 rounded-[8px] border border-black/[0.06] bg-white p-3 dark:border-white/[0.08] dark:bg-white/[0.05]"
                  >
                    <div
                      class="flex h-11 w-11 shrink-0 items-center justify-center rounded-[8px] bg-[#fff2d8] text-2xl dark:bg-white/[0.08]"
                    >
                      {gift.icon}
                    </div>
                    <div class="min-w-0 flex-1">
                      <p class="truncate text-sm font-medium text-graphite dark:text-dark-text">
                        {$t(gift.title)}
                      </p>
                      <p class="mt-0.5 truncate text-xs text-black/45 dark:text-white/45">
                        {$t(gift.meta)}
                      </p>
                    </div>
                    <span
                      class={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${gift.statusClasses}`}
                    >
                      {$t(gift.status)}
                    </span>
                  </div>
                {/each}
              </div>
            </div>
          </div>
        </div>
      </aside>
    </div>

    {#if loading}
      <div class="border-t border-black/[0.08] py-5 text-center dark:border-white/[0.08]">
        <div
          class="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent align-[-2px]"
        ></div>
        <span class="text-sm text-black/40 dark:text-white/40">{$t('app.loading')}</span>
      </div>
    {/if}
  </div>

  <div class="grid grid-cols-1 gap-5 lg:grid-cols-[0.74fr_1.26fr]">
    <section
      class="rounded-[8px] border border-black/[0.08] bg-white p-5 shadow-editorial-lg dark:border-white/[0.08] dark:bg-white/[0.03] sm:p-6"
    >
      <p class="text-xs font-semibold uppercase text-indigo-600 dark:text-indigo-300">
        {$t('users.privateHome.why.kicker')}
      </p>
      <h2 class="mt-3 text-2xl font-medium text-graphite dark:text-dark-text">
        {$t('users.privateHome.why.title')}
      </h2>
      <p class="mt-3 text-sm leading-relaxed text-black/60 dark:text-white/60">
        {$t('users.privateHome.why.body')}
      </p>
      <div class="mt-5 space-y-3">
        {#each reasonCards as card (card.title)}
          <div class="flex gap-3 rounded-[8px] bg-ivory p-3 dark:bg-dark-bg/80">
            <div class="text-xl">{card.icon}</div>
            <div>
              <p class="text-sm font-medium text-graphite dark:text-dark-text">
                {$t(card.title)}
              </p>
              <p class="mt-1 text-xs leading-relaxed text-black/58 dark:text-white/58">
                {$t(card.body)}
              </p>
            </div>
          </div>
        {/each}
      </div>
    </section>

    <section
      class="rounded-[8px] border border-black/[0.08] bg-white p-5 shadow-editorial dark:border-white/[0.08] dark:bg-white/[0.03] sm:p-6"
    >
      <p class="text-xs font-semibold uppercase text-indigo-600 dark:text-indigo-300">
        {$t('users.privateHome.how.kicker')}
      </p>
      <h2 class="mt-3 text-2xl font-medium text-graphite dark:text-dark-text">
        {$t('users.privateHome.how.title')}
      </h2>
      <div class="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {#each steps as step, index (step.title)}
          <article
            class="rounded-[8px] border border-black/[0.08] bg-ivory p-4 dark:border-white/[0.08] dark:bg-dark-bg/80"
          >
            <div class="flex items-center justify-between gap-3">
              <div class="text-2xl">{step.icon}</div>
              <div class="text-xs font-semibold text-black/35 dark:text-white/35">0{index + 1}</div>
            </div>
            <h3 class="mt-4 text-sm font-medium text-graphite dark:text-dark-text">
              {$t(step.title)}
            </h3>
            <p class="mt-2 text-xs leading-relaxed text-black/58 dark:text-white/58">
              {$t(step.body)}
            </p>
          </article>
        {/each}
      </div>
      <div
        id="wishlist-access"
        class="mt-5 rounded-[8px] border border-indigo-500/20 bg-indigo-50 p-4 dark:border-indigo-300/20 dark:bg-indigo-400/10"
      >
        <p class="text-sm font-medium text-graphite dark:text-dark-text">
          {$t('users.privateHome.access.title')}
        </p>
        <div class="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div class="rounded-[8px] bg-white/70 p-3 dark:bg-white/[0.05]">
            <p class="text-xs font-medium text-graphite dark:text-dark-text">
              {$t('users.privateHome.access.ownerTitle')}
            </p>
            <p class="mt-1 text-xs leading-relaxed text-black/58 dark:text-white/58">
              {$t('users.privateHome.access.ownerBody')}
            </p>
          </div>
          <div class="rounded-[8px] bg-white/70 p-3 dark:bg-white/[0.05]">
            <p class="text-xs font-medium text-graphite dark:text-dark-text">
              {$t('users.privateHome.access.guestTitle')}
            </p>
            <p class="mt-1 text-xs leading-relaxed text-black/58 dark:text-white/58">
              {$t('users.privateHome.access.guestBody')}
            </p>
          </div>
        </div>
      </div>
    </section>
  </div>

  <footer
    class="flex flex-col gap-4 border-t border-black/[0.08] px-1 pt-5 text-sm text-black/58 dark:border-white/[0.08] dark:text-white/58 sm:flex-row sm:items-center sm:justify-between"
  >
    <div>
      <p class="font-medium text-graphite dark:text-dark-text">🎁 Wishlist</p>
      <p class="mt-1 text-xs leading-relaxed">
        {$t('users.privateHome.footer.tagline', { year: currentYear })}
      </p>
    </div>
    <div class="flex flex-col gap-1 text-xs leading-relaxed sm:items-end">
      <p>{$t('users.privateHome.footer.ownerAccess')}</p>
      <p>{$t('users.privateHome.footer.guestAccess')}</p>
    </div>
  </footer>
</section>

{#if showInviteInfo}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm"
    role="button"
    tabindex="-1"
    aria-label={$t('users.privateHome.inviteModal.close')}
    on:click={(event) => {
      if (event.currentTarget === event.target) closeInviteInfo();
    }}
    on:keydown={handleKeydown}
  >
    <div
      class="w-full max-w-[var(--width-modal)] rounded-[8px] border border-black/[0.08] bg-ivory p-6 shadow-raised dark:border-white/[0.08] dark:bg-dark-bg"
      role="dialog"
      aria-modal="true"
      aria-labelledby="invite-info-title"
      tabindex="-1"
    >
      <div class="flex items-start justify-between gap-4">
        <div>
          <p class="text-xs font-semibold uppercase text-indigo-600 dark:text-indigo-300">
            {$t('users.privateHome.inviteModal.kicker')}
          </p>
          <h2
            id="invite-info-title"
            class="mt-2 text-2xl font-medium leading-tight text-graphite dark:text-dark-text"
          >
            {$t('users.privateHome.inviteModal.title')}
          </h2>
        </div>
        <button
          type="button"
          on:click={closeInviteInfo}
          class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-black/[0.08] bg-white text-xl text-graphite transition-all hover:bg-black/[0.04] dark:border-white/[0.08] dark:bg-white/[0.05] dark:text-dark-text dark:hover:bg-white/[0.08]"
          aria-label={$t('users.privateHome.inviteModal.close')}
        >
          ×
        </button>
      </div>

      <p class="mt-4 text-sm leading-relaxed text-black/64 dark:text-white/64">
        {$t('users.privateHome.inviteModal.body')}
      </p>

      <div class="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div class="rounded-[8px] bg-white p-4 dark:bg-white/[0.05]">
          <p class="text-sm font-medium text-graphite dark:text-dark-text">
            {$t('users.privateHome.inviteModal.ownerTitle')}
          </p>
          <p class="mt-2 text-sm leading-relaxed text-black/60 dark:text-white/60">
            {$t('users.privateHome.inviteModal.ownerBody')}
          </p>
        </div>
        <div class="rounded-[8px] bg-white p-4 dark:bg-white/[0.05]">
          <p class="text-sm font-medium text-graphite dark:text-dark-text">
            {$t('users.privateHome.inviteModal.guestTitle')}
          </p>
          <p class="mt-2 text-sm leading-relaxed text-black/60 dark:text-white/60">
            {$t('users.privateHome.inviteModal.guestBody')}
          </p>
        </div>
      </div>

      <div class="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          on:click={closeInviteInfo}
          class="inline-flex h-11 items-center justify-center rounded-full border border-black/[0.08] bg-white px-5 text-sm font-medium text-graphite transition-all hover:bg-black/[0.04] dark:border-white/[0.08] dark:bg-white/[0.05] dark:text-dark-text dark:hover:bg-white/[0.08]"
        >
          {$t('users.privateHome.inviteModal.close')}
        </button>
        <button
          type="button"
          on:click={openLogin}
          class="inline-flex h-11 items-center justify-center rounded-full bg-indigo-600 px-5 text-sm font-medium text-white transition-all hover:bg-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-400"
        >
          {$t('users.privateHome.cta.login')}
        </button>
      </div>
    </div>
  </div>
{/if}
