<script>
  import { onMount, onDestroy } from 'svelte';
  import { slide } from 'svelte/transition';
  import { toasts } from './lib/stores/toasts.js';
  import { theme } from './lib/stores/theme.js';
  import { locale } from './lib/stores/locale.js';
  import { auth } from './lib/stores/auth.js';
  import { fetchUsers, fetchUserGifts, fetchCategories, fetchPriorities } from './lib/utils/api.js';
  import GiftCard from './lib/GiftCard.svelte';
  import AddGiftModal from './lib/AddGiftModal.svelte';
  import EditGiftModal from './lib/EditGiftModal.svelte';
  import ReserveModal from './lib/ReserveModal.svelte';
  import DeleteModal from './lib/DeleteModal.svelte';
  import ViewGiftModal from './lib/ViewGiftModal.svelte';
  import LoginModal from './lib/LoginModal.svelte';
  import SecretCodeModal from './lib/SecretCodeModal.svelte';
  import SettingsModal from './lib/SettingsModal.svelte';
  import UserSelect from './lib/UserSelect.svelte';
  import ToastContainer from './lib/components/ToastContainer.svelte';
  import LanguageSwitcher from './lib/components/LanguageSwitcher.svelte';
  import { t } from './lib/utils/i18n.js';

  let currentTheme = 'dark';
  theme.subscribe((value) => { currentTheme = value; });

  // Auth state — subscribe to individual stores
  let isAuthenticated = false;
  let authUser = null;
  let authLoading = true;

  auth.isAuthenticated.subscribe(val => { isAuthenticated = val; });
  auth.user.subscribe(val => { authUser = val; });
  auth.loading.subscribe(val => { authLoading = val; });

  // Check if current user is the owner (authenticated user matches current wishlist user)
  $: isOwner = isAuthenticated && currentUser && authUser && authUser.id === currentUser.id;

  // Multi-user state
  let users = [];
  let currentUser = null;
  let usersLoading = true;

  let gifts = [];
  let loading = true;
  let showAddModal = false;
  let showEditModal = false;
  let showReserveModal = false;
  let showDeleteModal = false;
  let showViewModal = false;
  let showLoginModal = false;
  let showSettingsModal = false;

  // Secret code modal state
  let showSecretCodeModal = false;
  let secretCodeAction = null; // 'purchased' or 'unreserve'
  let secretCodeGift = null;

  let selectedGift = null;

  // Filter and search state
  let searchQuery = '';
  let selectedCategory = '';
  let selectedStatus = '';
  let selectedPriority = '';
  let sortBy = 'priority';
  let showPurchased = false;

  // Reference data from API
  let categoriesList = [];
  let prioritiesList = [];

  async function loadReferenceData() {
    try {
      [categoriesList, prioritiesList] = await Promise.all([
        fetchCategories($locale),
        fetchPriorities($locale)
      ]);
    } catch {
      // Fallback — empty lists, filters won't show
    }
  }

  $: $locale, loadReferenceData();

  // Hash-based routing
  function getSlugFromHash() {
    const hash = window.location.hash;
    const match = hash.match(/^#\/(.+)$/);
    return match ? match[1] : null;
  }

  function navigateToUser(user) {
    window.location.hash = `#/${user.slug}`;
  }

  function navigateToUserList() {
    window.location.hash = '';
  }

  function handleHashChange() {
    const slug = getSlugFromHash();
    if (slug && users.length > 0) {
      const user = users.find(u => u.slug === slug);
      if (user) {
        currentUser = user;
        loadGifts();
        return;
      }
    }
    currentUser = null;
    gifts = [];
  }

  onMount(async () => {
    await auth.init();
    await loadUsers();
    await loadReferenceData();
    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
  });

  onDestroy(() => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('hashchange', handleHashChange);
    }
  });

  async function loadUsers() {
    usersLoading = true;
    try {
      users = await fetchUsers();
      if (users.length === 1 && !getSlugFromHash()) {
        navigateToUser(users[0]);
      }
    } catch (error) {
      console.error('Error loading users:', error);
      users = [];
    } finally {
      usersLoading = false;
    }
  }

  function onUserSelect(event) {
    navigateToUser(event.detail);
  }

  async function loadGifts() {
    if (!currentUser) return;
    loading = true;
    try {
      gifts = await fetchUserGifts(currentUser.slug);
    } catch (error) {
      toasts.error($t('app.error'));
      console.error('Error loading gifts:', error);
    } finally {
      loading = false;
    }
  }

  // Helper to get priority code with fallback
  function getPriorityCode(gift) {
    return gift.priority_code || 'medium';
  }

  // Get grid span based on priority (Bento Grid logic)
  function getCardSpan(gift) {
    const priority = getPriorityCode(gift);
    const isLarge = priority === 'hot';
    return { isLarge, colSpan: isLarge ? 'lg:col-span-2' : '' };
  }

  // Priority order for sorting (from API sort_order)
  function getPriorityOrder(priorityCode) {
    const prio = prioritiesList.find(p => p.code === priorityCode);
    return prio ? prio.sort_order : 99;
  }

  // Split gifts into active and purchased
  $: activeGifts = gifts.filter((gift) => gift.status !== 'purchased');
  $: purchasedGifts = gifts.filter((gift) => gift.status === 'purchased');

  $: sortedPurchasedGifts = [...purchasedGifts].sort((a, b) => {
    const dateA = new Date(a.reserved_at || a.created_at).getTime();
    const dateB = new Date(b.reserved_at || b.created_at).getTime();
    return dateB - dateA;
  });

  $: filteredGifts = activeGifts.filter((gift) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesName = gift.name?.toLowerCase().includes(query);
      const matchesDesc = gift.description?.toLowerCase().includes(query);
      if (!matchesName && !matchesDesc) return false;
    }
    if (selectedCategory && gift.category_code !== selectedCategory) return false;
    if (selectedStatus && gift.status !== selectedStatus) return false;
    if (selectedPriority && getPriorityCode(gift) !== selectedPriority) return false;
    return true;
  });

  $: sortedGifts = [...filteredGifts].sort((a, b) => {
    switch (sortBy) {
      case 'priority': {
        const pa = getPriorityOrder(getPriorityCode(a));
        const pb = getPriorityOrder(getPriorityCode(b));
        if (pa !== pb) return pa - pb;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      case 'name':
        return a.name.localeCompare(b.name);
      case 'price': {
        const priceA = a.price_amount ?? Infinity;
        const priceB = b.price_amount ?? Infinity;
        return priceA - priceB;
      }
      case 'created_at':
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      default:
        return 0;
    }
  });

  function clearFilters() {
    searchQuery = '';
    selectedCategory = '';
    selectedStatus = '';
    selectedPriority = '';
    sortBy = 'priority';
  }

  function openAddModal() {
    if (!currentUser || !isOwner) return;
    showAddModal = true;
  }

  function openEditModal(gift) {
    if (!isOwner) return;
    selectedGift = gift;
    showEditModal = true;
  }

  function openReserveModal(gift) {
    selectedGift = gift;
    showReserveModal = true;
  }

  function openDeleteModal(gift) {
    if (!isOwner) return;
    selectedGift = gift;
    showDeleteModal = true;
  }

  function openViewModal(gift) {
    selectedGift = gift;
    showViewModal = true;
  }

  // Secret code actions (replacing browser prompt())
  function requestSecretCode(gift, action) {
    secretCodeGift = gift;
    secretCodeAction = action;
    showSecretCodeModal = true;
  }

  async function handleSecretCodeSubmit(event) {
    const { secretCode } = event.detail;
    showSecretCodeModal = false;

    if (!secretCodeGift || !secretCodeAction) return;

    try {
      const giftId = secretCodeGift.id;
      const slug = currentUser.slug;

      if (secretCodeAction === 'purchased') {
        const { purchaseUserGift } = await import('./lib/utils/api.js');
        await purchaseUserGift(slug, giftId, { secret_code: secretCode });
      } else if (secretCodeAction === 'unreserve') {
        const { unreserveUserGift } = await import('./lib/utils/api.js');
        await unreserveUserGift(slug, giftId, { secret_code: secretCode });
      }

      loadGifts();
    } catch (error) {
      toasts.error(error.message || $t('toasts.error'));
    } finally {
      secretCodeGift = null;
      secretCodeAction = null;
    }
  }

  function onGiftSaved() {
    showAddModal = false;
    showEditModal = false;
    showReserveModal = false;
    showDeleteModal = false;
    showViewModal = false;
    showLoginModal = false;
    selectedGift = null;
    loadGifts();
  }

  function handleLogin() {
    showLoginModal = true;
  }

  function handleLogout() {
    auth.logout();
    toasts.success($t('auth.logoutSuccess'));
  }

  function onAuthenticated() {
    showLoginModal = false;
    toasts.success($t('auth.loginSuccess'));
  }
</script>

<div class="min-h-screen bg-ivory dark:bg-dark-bg transition-colors duration-300">
  <ToastContainer />

  <div class="px-6 sm:px-7 py-6 sm:py-7">
    <!-- Header -->
    <header class="flex items-center justify-between mb-6 sm:mb-7">
      <div class="flex items-center gap-3">
        {#if currentUser && users.length > 1}
          <button
            on:click={navigateToUserList}
            class="px-3 py-1.5 rounded-full text-xs bg-black/5 dark:bg-white/5 text-black/60 dark:text-white/60 hover:bg-black/10 dark:hover:bg-white/10 transition-all"
            title={$t('users.backToUsers')}
          >
            ← {$t('users.backToUsers')}
          </button>
        {/if}
        <h1 class="text-2xl sm:text-3xl font-medium tracking-tighter text-graphite dark:text-dark-text" style="letter-spacing: -0.02em;">
          {#if currentUser}
            {currentUser.avatar_emoji || '🎁'} {currentUser.name}
          {:else}
            🎁 Wishlist
          {/if}
        </h1>
      </div>

      <div class="flex items-center gap-2 sm:gap-3">
        <!-- Theme Toggle -->
        <button
          on:click={() => theme.set(currentTheme === 'dark' ? 'light' : 'dark')}
          class="px-4 py-2 rounded-full bg-ivory dark:bg-dark-bg hover:bg-ivory dark:hover:bg-black/5 border border-black/[0.08] dark:border-white/[0.08] shadow-editorial transition-all duration-200 flex items-center justify-center gap-2 text-graphite dark:text-dark-text hover:scale-105 active:scale-95"
          title={$t(`theme.${currentTheme === 'dark' ? 'light' : 'dark'}Theme`)}
        >
          <span class="text-xl">{currentTheme === 'dark' ? '☀️' : '🌙'}</span>
        </button>

        <!-- Language Switcher -->
        <LanguageSwitcher />

        <!-- Auth: Login/Logout -->
        {#if !authLoading}
          {#if isAuthenticated}
            <button
              on:click={() => showSettingsModal = true}
              class="px-4 py-2 rounded-full bg-ivory dark:bg-dark-bg hover:bg-ivory dark:hover:bg-black/5 border border-black/[0.08] dark:border-white/[0.08] shadow-editorial transition-all duration-200 flex items-center justify-center text-graphite dark:text-dark-text hover:scale-105 active:scale-95"
              title={$t('settings.title')}
            >
              <span class="text-xl">⚙️</span>
            </button>
            <button
              on:click={handleLogout}
              class="h-[42px] px-4 rounded-full bg-ivory dark:bg-dark-bg hover:bg-ivory dark:hover:bg-black/5 border border-black/[0.08] dark:border-white/[0.08] shadow-editorial transition-all duration-200 flex items-center gap-2 text-sm font-medium text-graphite dark:text-dark-text hover:scale-105 active:scale-95"
            >
              {authUser?.name || $t('auth.logout')} ✕
            </button>
          {:else if currentUser}
            <button
              on:click={handleLogin}
              class="h-[42px] px-4 rounded-full bg-ivory dark:bg-dark-bg hover:bg-ivory dark:hover:bg-black/5 border border-black/[0.08] dark:border-white/[0.08] shadow-editorial transition-all duration-200 flex items-center gap-2 text-sm font-medium text-graphite dark:text-dark-text hover:scale-105 active:scale-95"
            >
              🔒 {$t('auth.login')}
            </button>
          {/if}
        {/if}

        <!-- Add Button (only for owner) -->
        {#if isOwner}
          <button
            on:click={openAddModal}
            class="flex items-center gap-2 bg-indigo-600 dark:bg-indigo-500 hover:bg-indigo-500 dark:hover:bg-indigo-400 text-white px-4 sm:px-5 py-2 rounded-full shadow-editorial transition-all duration-200 text-sm font-medium tracking-tighter hover:shadow-editorial-lg hover:-translate-y-0.5 active:translate-y-0"
          >
            <span class="text-base">+</span>
            <span class="hidden sm:inline">{$t('app.addButton')}</span>
          </button>
        {/if}
      </div>
    </header>

    {#if !currentUser}
      <UserSelect
        {users}
        loading={usersLoading}
        on:select={onUserSelect}
      />
    {:else}
      <!-- Search and Filters -->
      <div class="mb-6 sm:mb-7 space-y-4">
        <div class="relative">
          <input
            type="text"
            bind:value={searchQuery}
            placeholder={$t('app.filterPlaceholder')}
            class="w-full px-5 py-3 pl-11 bg-white/80 dark:bg-dark-bg/80 backdrop-blur-md border border-black/[0.08] dark:border-white/[0.08] rounded-none text-graphite dark:text-dark-text placeholder-black/40 dark:placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500/30 transition-all shadow-editorial"
          />
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <select
            bind:value={selectedCategory}
            class="px-3 py-2 bg-white dark:bg-dark-bg border border-black/[0.08] dark:border-white/[0.08] rounded-full text-xs text-graphite dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all cursor-pointer"
          >
            <option value="">{$t('filters.allCategories')}</option>
            {#each categoriesList as cat (cat.code)}
              <option value={cat.code}>{cat.emoji} {cat.name}</option>
            {/each}
          </select>

          <div class="flex gap-2 flex-wrap items-center">
            {#each ['available', 'reserved'] as status}
              <button
                on:click={() => selectedStatus = selectedStatus === status ? '' : status}
                class:font-medium={selectedStatus === status}
                class="whitespace-nowrap px-3 py-1.5 rounded-full text-xs transition-all {selectedStatus === status
                  ? 'bg-graphite text-white'
                  : 'bg-transparent border border-black/10 dark:border-white/10 text-black/70 dark:text-white/70 hover:bg-black/5 dark:hover:bg-white/5'}"
              >
                {status === 'available' ? '✨' : '🔒'} {$t('status.' + status)}
              </button>
            {/each}

            <div class="w-px h-4 bg-black/10 dark:bg-white/10 mx-1"></div>

            {#each prioritiesList as prio (prio.code)}
              <button
                on:click={() => selectedPriority = selectedPriority === prio.code ? '' : prio.code}
                class:font-medium={selectedPriority === prio.code}
                class="whitespace-nowrap px-3 py-1.5 rounded-full text-xs transition-all {selectedPriority === prio.code
                  ? 'bg-graphite text-white'
                  : 'bg-transparent border border-black/10 dark:border-white/10 text-black/70 dark:text-white/70 hover:bg-black/5 dark:hover:bg-white/5'}"
              >
                {prio.emoji} {prio.name}
              </button>
            {/each}
          </div>

          <select
            bind:value={sortBy}
            class="px-3 py-2 bg-white dark:bg-dark-bg border border-black/[0.08] dark:border-white/[0.08] rounded-full text-xs text-graphite dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all cursor-pointer"
          >
            <option value="priority">🔥 {$t('filters.sortByPriority')}</option>
            <option value="name">🔤 {$t('filters.sortByName')}</option>
            <option value="price">💰 {$t('filters.sortByPrice')}</option>
            <option value="created_at">📅 {$t('filters.sortByDate')}</option>
          </select>

          {#if searchQuery || selectedCategory || selectedStatus || selectedPriority || sortBy !== 'priority'}
            <button
              on:click={clearFilters}
              class="px-3 py-1.5 rounded-full text-xs bg-black/5 dark:bg-white/5 text-black/60 dark:text-white/60 hover:bg-black/10 dark:hover:bg-white/10 transition-all"
            >
              ✕ {$t('actions.cancel')}
            </button>
          {/if}
        </div>

        {#if filteredGifts.length !== activeGifts.length}
          <p class="text-xs sm:text-sm text-black/60 dark:text-white/60 flex items-center gap-2">
            <span class="inline-block w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
            {$t('filters.resultsCount', { count: sortedGifts.length, total: activeGifts.length })}
          </p>
        {/if}
      </div>

      <!-- Loading State -->
      {#if loading}
        <div class="flex items-center justify-center py-14">
          <div class="text-center">
            <div class="inline-block animate-spin rounded-full h-12 w-12 border-[3px] border-indigo-500 border-t-transparent mb-4"></div>
            <p class="text-black/40 dark:text-white/40">{$t('app.loading')}</p>
          </div>
        </div>
      {:else if gifts.length === 0}
        <div class="flex items-center justify-center py-14">
          <div class="text-center">
            <div class="text-6xl mb-4 opacity-20">🎁</div>
            <h3 class="text-xl font-medium tracking-tighter text-black/30 dark:text-white/30 mb-2">{$t('app.noGifts')}</h3>
            <p class="text-black/50 dark:text-white/50 text-sm">{$t('app.noGiftsDescription')}</p>
          </div>
        </div>
      {:else if sortedGifts.length === 0}
        <div class="flex items-center justify-center py-14">
          <div class="text-center">
            <div class="text-6xl mb-4 opacity-20">🔍</div>
            <h3 class="text-xl font-medium tracking-tighter text-black/30 dark:text-white/30 mb-2">{$t('app.noGifts')}</h3>
            <p class="text-black/50 dark:text-white/50 text-sm">{$t('app.noGiftsDescription')}</p>
          </div>
        </div>
      {:else}
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 md:gap-5">
          {#each sortedGifts as gift, index (gift.id + gift.status)}
            {@const cardSpan = getCardSpan(gift)}
            <div class={cardSpan.colSpan}>
              <GiftCard
                {gift}
                {index}
                isLarge={cardSpan.isLarge}
                {isOwner}
                userSlug={currentUser?.slug}
                on:view={() => openViewModal(gift)}
                on:edit={() => openEditModal(gift)}
                on:reserve={() => openReserveModal(gift)}
                on:delete={() => openDeleteModal(gift)}
                on:purchased={(e) => requestSecretCode(gift, 'purchased')}
                on:unreserve={(e) => requestSecretCode(gift, 'unreserve')}
                on:refresh={loadGifts}
              />
            </div>
          {/each}
        </div>
      {/if}

      <!-- Purchased Gifts Section -->
      {#if sortedPurchasedGifts.length > 0}
        <div class="mt-8 sm:mt-10">
          <button
            on:click={() => showPurchased = !showPurchased}
            class="flex items-center gap-2 text-sm text-black/50 dark:text-white/50 hover:text-black/70 dark:hover:text-white/70 transition-colors duration-200 mb-4"
          >
            <span class="text-xs transition-transform duration-200" class:rotate-90={showPurchased}>&#9654;</span>
            <span>{$t('filters.purchasedSection')}</span>
            <span class="px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/5 text-xs">{sortedPurchasedGifts.length}</span>
          </button>

          {#if showPurchased}
            <div transition:slide={{ duration: 300 }}>
              <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 md:gap-5 opacity-75">
                {#each sortedPurchasedGifts as gift, index (gift.id)}
                  <div>
                    <GiftCard
                      {gift}
                      {index}
                      isLarge={false}
                      {isOwner}
                      userSlug={currentUser?.slug}
                      on:view={() => openViewModal(gift)}
                      on:edit={() => openEditModal(gift)}
                      on:reserve={() => openReserveModal(gift)}
                      on:delete={() => openDeleteModal(gift)}
                      on:unreserve={(e) => requestSecretCode(gift, 'unreserve')}
                      on:refresh={loadGifts}
                    />
                  </div>
                {/each}
              </div>
            </div>
          {/if}
        </div>
      {/if}
    {/if}
  </div>
</div>

<!-- Modals -->
{#if showSettingsModal && isAuthenticated}
  <SettingsModal
    on:close={() => (showSettingsModal = false)}
    on:updated={loadGifts}
  />
{/if}

{#if showLoginModal && currentUser}
  <LoginModal
    userSlug={currentUser.slug}
    on:close={() => (showLoginModal = false)}
    on:authenticated={onAuthenticated}
  />
{/if}

{#if showAddModal && currentUser && isOwner}
  <AddGiftModal
    userSlug={currentUser.slug}
    on:close={() => (showAddModal = false)}
    on:saved={onGiftSaved}
  />
{/if}

{#if showEditModal && selectedGift && currentUser && isOwner}
  <EditGiftModal
    gift={selectedGift}
    userSlug={currentUser.slug}
    on:close={() => (showEditModal = false)}
    on:saved={onGiftSaved}
  />
{/if}

{#if showReserveModal && selectedGift && currentUser}
  <ReserveModal
    gift={selectedGift}
    userSlug={currentUser.slug}
    on:close={() => (showReserveModal = false)}
    on:saved={onGiftSaved}
  />
{/if}

{#if showDeleteModal && selectedGift && currentUser && isOwner}
  <DeleteModal
    gift={selectedGift}
    userSlug={currentUser.slug}
    on:close={() => (showDeleteModal = false)}
    on:deleted={onGiftSaved}
  />
{/if}

{#if showViewModal && selectedGift && currentUser}
  <ViewGiftModal
    gift={selectedGift}
    userSlug={currentUser.slug}
    on:close={() => (showViewModal = false)}
    on:reserve={(e) => {
      showViewModal = false;
      openReserveModal(selectedGift);
    }}
    on:purchased={(e) => {
      showViewModal = false;
      requestSecretCode(selectedGift, 'purchased');
    }}
  />
{/if}

{#if showSecretCodeModal}
  <SecretCodeModal
    title={secretCodeAction === 'purchased' ? $t('modals.markPurchased.title') : $t('modals.unreserve.title')}
    description={secretCodeAction === 'purchased' ? $t('modals.markPurchased.prompt') : $t('modals.unreserve.prompt')}
    on:close={() => (showSecretCodeModal = false)}
    on:submit={handleSecretCodeSubmit}
  />
{/if}

<style>
  .scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }
</style>
