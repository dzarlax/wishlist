<script>
  import { onMount } from 'svelte';
  import { toasts } from './lib/stores/toasts.js';
  import { theme } from './lib/stores/theme.js';
  import { getAdminPassword } from './lib/utils/api.js';
  import GiftCard from './lib/GiftCard.svelte';
  import AddGiftModal from './lib/AddGiftModal.svelte';
  import EditGiftModal from './lib/EditGiftModal.svelte';
  import ReserveModal from './lib/ReserveModal.svelte';
  import DeleteModal from './lib/DeleteModal.svelte';
  import ViewGiftModal from './lib/ViewGiftModal.svelte';
  import PasswordModal from './lib/PasswordModal.svelte';
  import ToastContainer from './lib/components/ToastContainer.svelte';
  import LanguageSwitcher from './lib/components/LanguageSwitcher.svelte';
  import { t } from './lib/utils/i18n.js';

  let currentTheme = 'dark';

  // Subscribe to theme changes
  theme.subscribe((value) => {
    currentTheme = value;
  });

  let gifts = [];
  let loading = true;
  let showAddModal = false;
  let showEditModal = false;
  let showReserveModal = false;
  let showDeleteModal = false;
  let showViewModal = false;
  let showPasswordModal = false;

  let selectedGift = null;

  // Filter and search state
  let searchQuery = '';
  let selectedCategory = '';
  let selectedStatus = '';
  let selectedPriority = '';
  let sortBy = 'priority'; // 'priority', 'name', 'created_at'

  onMount(async () => {
    await loadGifts();
  });

  async function loadGifts() {
    loading = true;
    try {
      const response = await fetch('/api/gifts');
      gifts = await response.json();
    } catch (error) {
      toasts.error($t('app.error'));
      console.error('Error loading gifts:', error);
    } finally {
      loading = false;
    }
  }

  // Derived values
  $: categoriesList = [
    { code: 'electronics', name: $t('categories.electronics') },
    { code: 'home', name: $t('categories.home') },
    { code: 'accessories', name: $t('categories.accessories') },
    { code: 'education', name: $t('categories.education') },
    { code: 'games', name: $t('categories.games') },
    { code: 'clothing', name: $t('categories.clothing') },
    { code: 'sports', name: $t('categories.sports') },
    { code: 'creativity', name: $t('categories.creativity') },
  ];

  $: prioritiesList = [
    { code: 'hot', name: $t('priorities.hot') },
    { code: 'medium', name: $t('priorities.medium') },
    { code: 'low', name: $t('priorities.low') },
  ];

  // Helper to get priority code with fallback
  function getPriorityCode(gift) {
    if (gift.priority_code) return gift.priority_code;
    // Fallback to old priority text mapping
    const priorityMapping = $t('priorityMapping');
    return priorityMapping[gift.priority] || 'medium';
  }

  // Priority order for sorting
  function getPriorityOrder(priorityCode) {
    const order = { hot: 1, medium: 2, low: 3 };
    return order[priorityCode] || order['medium'] || 2;
  }

  // Filter gifts based on search and filters
  $: filteredGifts = gifts.filter((gift) => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesName = gift.name?.toLowerCase().includes(query);
      const matchesDesc = gift.description?.toLowerCase().includes(query);
      if (!matchesName && !matchesDesc) return false;
    }

    // Category filter
    if (selectedCategory && gift.category_code !== selectedCategory) return false;

    // Status filter
    if (selectedStatus && gift.status !== selectedStatus) return false;

    // Priority filter
    if (selectedPriority && getPriorityCode(gift) !== selectedPriority) {
      return false;
    }

    return true;
  });

  // Sort filtered gifts
  $: sortedGifts = [...filteredGifts].sort((a, b) => {
    switch (sortBy) {
      case 'priority': {
        const pa = getPriorityOrder(getPriorityCode(a));
        const pb = getPriorityOrder(getPriorityCode(b));
        if (pa !== pb) return pa - pb;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }

      case 'name': {
        const locale = $theme === 'dark' ? 'ru' : 'en'; // Simplified, should use locale store
        return a.name.localeCompare(b.name, locale);
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
    // Check if admin password is already saved
    const savedPassword = getAdminPassword();
    if (savedPassword) {
      // Password exists, open AddGiftModal directly
      showAddModal = true;
    } else {
      // No password, show authentication modal first
      showPasswordModal = true;
    }
  }

  function onPasswordAuthenticated() {
    showPasswordModal = false;
    showAddModal = true;
  }

  function openEditModal(gift) {
    selectedGift = gift;
    showEditModal = true;
  }

  function openReserveModal(gift) {
    selectedGift = gift;
    showReserveModal = true;
  }

  function openDeleteModal(gift) {
    selectedGift = gift;
    showDeleteModal = true;
  }

  function openViewModal(gift) {
    selectedGift = gift;
    showViewModal = true;
  }

  function onGiftSaved() {
    showAddModal = false;
    showEditModal = false;
    showReserveModal = false;
    showDeleteModal = false;
    showViewModal = false;
    showPasswordModal = false;
    selectedGift = null;
    loadGifts();
  }
</script>

<div
  class="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950 transition-colors duration-300"
>
  <!-- Toast Container -->
  <ToastContainer />

  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
    <!-- Header -->
    <header class="flex items-center justify-between mb-6 sm:mb-8">
      <div class="flex items-center gap-3">
        <h1
          class="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 dark:from-indigo-400 dark:via-purple-400 dark:to-pink-400 bg-clip-text text-transparent"
        >
          🎁 Wishlist
        </h1>
      </div>

      <div class="flex items-center gap-2 sm:gap-3">
        <!-- Theme Toggle -->
        <button
          on:click={() => theme.set(currentTheme === 'dark' ? 'light' : 'dark')}
          class="px-3 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 transition-all duration-200 flex items-center justify-center gap-2 text-slate-700 dark:text-slate-300 hover:scale-105 active:scale-95"
          title={$t(`theme.${currentTheme === 'dark' ? 'light' : 'dark'}Theme`)}
        >
          <span class="text-xl">{currentTheme === 'dark' ? '☀️' : '🌙'}</span>
        </button>

        <!-- Language Switcher -->
        <LanguageSwitcher />

        <!-- Add Button -->
        <button
          on:click={openAddModal}
          class="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white px-3 sm:px-4 py-2.5 rounded-xl border border-indigo-500/50 shadow-lg shadow-indigo-500/20 transition-all duration-200 text-sm font-semibold hover:shadow-xl hover:shadow-indigo-500/30 hover:-translate-y-0.5 active:translate-y-0"
        >
          <span class="text-base">+</span>
          <span class="hidden sm:inline">{$t('app.addButton')}</span>
        </button>
      </div>
    </header>

    <!-- Search and Filters -->
    <div class="mb-6 sm:mb-8 space-y-4">
      <!-- Search Bar -->
      <div class="relative">
        <input
          type="text"
          bind:value={searchQuery}
          placeholder={$t('app.filterPlaceholder')}
          class="w-full px-4 py-3 pl-11 bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm border border-slate-300 dark:border-slate-700/50 rounded-xl text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all shadow-lg"
        />
      </div>

      <!-- Filters Row -->
      <div class="flex flex-wrap gap-2">
        <!-- Category Filter -->
        <div class="flex-1 min-w-[140px] sm:min-w-[160px]">
          <select
            bind:value={selectedCategory}
            class="w-full px-4 py-2 bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm border border-slate-300 dark:border-slate-700/50 rounded-lg text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all hover:border-slate-400 dark:hover:border-slate-600/50"
          >
            <option value="">{$t('filters.allCategories')}</option>
            {#each categoriesList as cat (cat.code)}
              <option value={cat.code}>{cat.name}</option>
            {/each}
          </select>
        </div>

        <!-- Status Filter -->
        <div class="flex-1 min-w-[140px] sm:min-w-[160px]">
          <select
            bind:value={selectedStatus}
            class="w-full px-4 py-2 bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm border border-slate-300 dark:border-slate-700/50 rounded-lg text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all hover:border-slate-400 dark:hover:border-slate-600/50"
          >
            <option value="">{$t('filters.allStatuses')}</option>
            <option value="available">✨ {$t('status.available')}</option>
            <option value="reserved">🔒 {$t('status.reserved')}</option>
            <option value="purchased">✅ {$t('status.purchased')}</option>
          </select>
        </div>

        <!-- Priority Filter -->
        <div class="flex-1 min-w-[140px] sm:min-w-[160px]">
          <select
            bind:value={selectedPriority}
            class="w-full px-4 py-2 bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm border border-slate-300 dark:border-slate-700/50 rounded-lg text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all hover:border-slate-400 dark:hover:border-slate-600/50"
          >
            <option value="">{$t('filters.allPriorities')}</option>
            {#each prioritiesList as prio (prio.code)}
              <option value={prio.code}>{prio.name}</option>
            {/each}
          </select>
        </div>

        <!-- Sort By -->
        <div class="flex-1 min-w-[140px] sm:min-w-[160px]">
          <select
            bind:value={sortBy}
            class="w-full px-4 py-2 bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm border border-slate-300 dark:border-slate-700/50 rounded-lg text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all hover:border-slate-400 dark:hover:border-slate-600/50"
          >
            <option value="priority">🔥 {$t('filters.sortByPriority')}</option>
            <option value="name">🔤 {$t('filters.sortByName')}</option>
            <option value="created_at">📅 {$t('filters.sortByDate')}</option>
          </select>
        </div>

        <!-- Clear Filters Button -->
        {#if searchQuery || selectedCategory || selectedStatus || selectedPriority || sortBy !== 'priority'}
          <div class="flex-1 min-w-[140px] sm:min-w-[160px]">
            <button
              on:click={clearFilters}
              class="w-full px-4 py-2 bg-slate-200 dark:bg-slate-800/80 hover:bg-slate-300 dark:hover:bg-slate-700/80 backdrop-blur-sm text-slate-700 dark:text-slate-300 text-sm rounded-lg border border-slate-300 dark:border-slate-700/50 transition-all hover:scale-105 active:scale-95"
            >
              ✕ {$t('actions.cancel')}
            </button>
          </div>
        {/if}
      </div>

      <!-- Results Count -->
      {#if filteredGifts.length !== gifts.length}
        <p class="text-xs sm:text-sm text-slate-600 dark:text-slate-400 flex items-center gap-2">
          <span class="inline-block w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
          {$t('filters.resultsCount', { count: sortedGifts.length, total: gifts.length })}
        </p>
      {/if}
    </div>

    <!-- Loading State -->
    {#if loading}
      <div class="flex items-center justify-center py-32">
        <div class="text-center">
          <div
            class="inline-block animate-spin rounded-full h-12 w-12 border-3 border-indigo-500 border-t-transparent mb-4"
          ></div>
          <p class="text-slate-400">{$t('app.loading')}</p>
        </div>
      </div>
    {:else if gifts.length === 0}
      <!-- Empty State -->
      <div class="flex items-center justify-center py-32">
        <div class="text-center">
          <div class="text-6xl mb-4 opacity-20">🎁</div>
          <h3 class="text-xl font-semibold text-slate-300 mb-2">{$t('app.noGifts')}</h3>
          <p class="text-slate-500 text-sm">{$t('app.noGiftsDescription')}</p>
        </div>
      </div>
    {:else if sortedGifts.length === 0}
      <!-- No Results -->
      <div class="flex items-center justify-center py-32">
        <div class="text-center">
          <div class="text-6xl mb-4 opacity-20">🔍</div>
          <h3 class="text-xl font-semibold text-slate-300 mb-2">{$t('app.noGifts')}</h3>
          <p class="text-slate-500 text-sm">{$t('app.noGiftsDescription')}</p>
        </div>
      </div>
    {:else}
      <!-- Gifts Grid -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-5">
        {#each sortedGifts as gift, index (gift.id + gift.status)}
          <GiftCard
            {gift}
            {index}
            on:view={() => openViewModal(gift)}
            on:edit={() => openEditModal(gift)}
            on:reserve={() => openReserveModal(gift)}
            on:delete={() => openDeleteModal(gift)}
            on:refresh={loadGifts}
          />
        {/each}
      </div>
    {/if}
  </div>
</div>

<!-- Modals -->
{#if showPasswordModal}
  <PasswordModal
    on:close={() => (showPasswordModal = false)}
    on:authenticated={onPasswordAuthenticated}
  />
{/if}

{#if showAddModal}
  <AddGiftModal on:close={() => (showAddModal = false)} on:saved={onGiftSaved} />
{/if}

{#if showEditModal && selectedGift}
  <EditGiftModal
    gift={selectedGift}
    on:close={() => (showEditModal = false)}
    on:saved={onGiftSaved}
  />
{/if}

{#if showReserveModal && selectedGift}
  <ReserveModal
    gift={selectedGift}
    on:close={() => (showReserveModal = false)}
    on:saved={onGiftSaved}
  />
{/if}

{#if showDeleteModal && selectedGift}
  <DeleteModal
    gift={selectedGift}
    on:close={() => (showDeleteModal = false)}
    on:deleted={onGiftSaved}
  />
{/if}

{#if showViewModal && selectedGift}
  <ViewGiftModal
    gift={selectedGift}
    on:close={() => (showViewModal = false)}
  />
{/if}
