<script>
  import { onMount } from 'svelte';
  import { slide } from 'svelte/transition';
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
  let showAllFilters = false; // Progressive disclosure for filters
  let showPurchased = false; // Toggle for purchased gifts section

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

  // Get grid span based on priority (Bento Grid logic)
  function getCardSpan(gift) {
    const priority = getPriorityCode(gift);
    // Hot priority items span 2 columns on larger screens
    // Mobile: always 1 column (col-span-1 is default)
    // Desktop (lg+): hot items get 2 columns for visual hierarchy
    const isLarge = priority === 'hot';

    return {
      isLarge,
      colSpan: isLarge ? 'lg:col-span-2' : ''
    };
  }

  // Priority order for sorting
  function getPriorityOrder(priorityCode) {
    const order = { hot: 1, medium: 2, low: 3 };
    return order[priorityCode] || order['medium'] || 2;
  }

  // Split gifts into active and purchased
  $: activeGifts = gifts.filter((gift) => gift.status !== 'purchased');
  $: purchasedGifts = gifts.filter((gift) => gift.status === 'purchased');

  // Sort purchased gifts by reserved_at or created_at descending
  $: sortedPurchasedGifts = [...purchasedGifts].sort((a, b) => {
    const dateA = new Date(a.reserved_at || a.created_at).getTime();
    const dateB = new Date(b.reserved_at || b.created_at).getTime();
    return dateB - dateA;
  });

  // Filter active gifts based on search and filters
  $: filteredGifts = activeGifts.filter((gift) => {
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

<div class="min-h-screen bg-ivory dark:bg-dark-bg transition-colors duration-300">
  <!-- Toast Container -->
  <ToastContainer />

  <div class="px-6 sm:px-7 py-6 sm:py-7">
    <!-- Header -->
    <header class="flex items-center justify-between mb-6 sm:mb-7">
      <div class="flex items-center gap-3">
        <h1 class="text-2xl sm:text-3xl font-medium tracking-tighter text-graphite dark:text-dark-text" style="letter-spacing: -0.02em;">
          🎁 Wishlist
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

        <!-- Add Button -->
        <button
          on:click={openAddModal}
          class="flex items-center gap-2 bg-indigo-600 dark:bg-indigo-500 hover:bg-indigo-500 dark:hover:bg-indigo-400 text-white px-4 sm:px-5 py-2 rounded-full shadow-editorial transition-all duration-200 text-sm font-medium tracking-tighter hover:shadow-editorial-lg hover:-translate-y-0.5 active:translate-y-0"
        >
          <span class="text-base">+</span>
          <span class="hidden sm:inline">{$t('app.addButton')}</span>
        </button>
      </div>
    </header>

    <!-- Search and Filters -->
    <div class="mb-6 sm:mb-7 space-y-4">
      <!-- Search Bar -->
      <div class="relative">
        <input
          type="text"
          bind:value={searchQuery}
          placeholder={$t('app.filterPlaceholder')}
          class="w-full px-5 py-3 pl-11 bg-white/80 dark:bg-dark-bg/80 backdrop-blur-md border border-black/[0.08] dark:border-white/[0.08] rounded-none text-graphite dark:text-dark-text placeholder-black/40 dark:placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500/30 transition-all shadow-editorial"
        />
      </div>

      <!-- Filters Row - Compact single row -->
      <div class="flex flex-wrap items-center gap-2">
        <!-- Category Dropdown -->
        <select
          bind:value={selectedCategory}
          class="px-3 py-2 bg-white dark:bg-dark-bg border border-black/[0.08] dark:border-white/[0.08] rounded-full text-xs text-graphite dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all cursor-pointer"
        >
          <option value="">{$t('filters.allCategories')}</option>
          {#each categoriesList as cat (cat.code)}
            <option value={cat.code}>{cat.name}</option>
          {/each}
        </select>

        <!-- Status & Priority Chips -->
        <div class="flex gap-2 flex-wrap items-center">
          {#each ['available', 'reserved'] as status}
            <button
              on:click={() => selectedStatus = selectedStatus === status ? '' : status}
              class:font-medium={selectedStatus === status}
              class="whitespace-nowrap px-3 py-1.5 rounded-full text-xs transition-all {selectedStatus === status
                ? 'bg-graphite text-white'
                : 'bg-transparent border border-black/10 dark:border-white/10 text-black/70 dark:text-white/70 hover:bg-black/5 dark:hover:bg-white/5'}"
            >
              {status === 'available' ? '✨' : status === 'reserved' ? '🔒' : '✅'} {$t('status.' + status)}
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
              {prio.name}
            </button>
          {/each}
        </div>

        <!-- Sort Dropdown -->
        <select
          bind:value={sortBy}
          class="px-3 py-2 bg-white dark:bg-dark-bg border border-black/[0.08] dark:border-white/[0.08] rounded-full text-xs text-graphite dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all cursor-pointer"
        >
          <option value="priority">🔥 {$t('filters.sortByPriority')}</option>
          <option value="name">🔤 {$t('filters.sortByName')}</option>
          <option value="created_at">📅 {$t('filters.sortByDate')}</option>
        </select>

        <!-- Clear Filters -->
        {#if searchQuery || selectedCategory || selectedStatus || selectedPriority || sortBy !== 'priority'}
          <button
            on:click={clearFilters}
            class="px-3 py-1.5 rounded-full text-xs bg-black/5 dark:bg-white/5 text-black/60 dark:text-white/60 hover:bg-black/10 dark:hover:bg-white/10 transition-all"
          >
            ✕ {$t('actions.cancel')}
          </button>
        {/if}
      </div>

      <!-- Results Count -->
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
          <div
            class="inline-block animate-spin rounded-full h-12 w-12 border-[3px] border-indigo-500 border-t-transparent mb-4"
          ></div>
          <p class="text-black/40 dark:text-white/40">{$t('app.loading')}</p>
        </div>
      </div>
    {:else if gifts.length === 0}
      <!-- Empty State -->
      <div class="flex items-center justify-center py-14">
        <div class="text-center">
          <div class="text-6xl mb-4 opacity-20">🎁</div>
          <h3 class="text-xl font-medium tracking-tighter text-black/30 dark:text-white/30 mb-2">{$t('app.noGifts')}</h3>
          <p class="text-black/50 dark:text-white/50 text-sm">{$t('app.noGiftsDescription')}</p>
        </div>
      </div>
    {:else if sortedGifts.length === 0}
      <!-- No Results -->
      <div class="flex items-center justify-center py-14">
        <div class="text-center">
          <div class="text-6xl mb-4 opacity-20">🔍</div>
          <h3 class="text-xl font-medium tracking-tighter text-black/30 dark:text-white/30 mb-2">{$t('app.noGifts')}</h3>
          <p class="text-black/50 dark:text-white/50 text-sm">{$t('app.noGiftsDescription')}</p>
        </div>
      </div>
    {:else}
      <!-- Gifts Grid -->
      <!-- Bento: lg has 3 cols, important items span 2. This creates rhythm. -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 md:gap-5">
        {#each sortedGifts as gift, index (gift.id + gift.status)}
          {@const cardSpan = getCardSpan(gift)}
          <div class={cardSpan.colSpan}>
            <GiftCard
              {gift}
              {index}
              isLarge={cardSpan.isLarge}
              on:view={() => openViewModal(gift)}
              on:edit={() => openEditModal(gift)}
              on:reserve={() => openReserveModal(gift)}
              on:delete={() => openDeleteModal(gift)}
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
                    on:view={() => openViewModal(gift)}
                    on:edit={() => openEditModal(gift)}
                    on:reserve={() => openReserveModal(gift)}
                    on:delete={() => openDeleteModal(gift)}
                    on:refresh={loadGifts}
                  />
                </div>
              {/each}
            </div>
          </div>
        {/if}
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
    on:reserve={(e) => {
      showViewModal = false;
      openReserveModal(selectedGift);
    }}
    on:purchased={(e) => {
      showViewModal = false;
      openReserveModal(selectedGift);
    }}
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
