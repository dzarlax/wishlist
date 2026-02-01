<script>
  import { onMount } from 'svelte';
  import { toasts } from './lib/stores/toasts.js';
  import { theme } from './lib/stores/theme.js';
  import GiftCard from './lib/GiftCard.svelte';
  import AddGiftModal from './lib/AddGiftModal.svelte';
  import EditGiftModal from './lib/EditGiftModal.svelte';
  import ReserveModal from './lib/ReserveModal.svelte';
  import DeleteModal from './lib/DeleteModal.svelte';
  import ToastContainer from './lib/components/ToastContainer.svelte';

  let currentTheme = 'dark';

  // Subscribe to theme changes
  theme.subscribe(value => {
    currentTheme = value;
  });

  let gifts = [];
  let loading = true;
  let showAddModal = false;
  let showEditModal = false;
  let showReserveModal = false;
  let showDeleteModal = false;

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
      toasts.error('Ошибка при загрузке подарков');
      console.error('Error loading gifts:', error);
    } finally {
      loading = false;
    }
  }

  // Derived values
  $: categories = [...new Set(gifts.map(g => g.category).filter(Boolean))].sort();
  $: statuses = ['available', 'reserved', 'purchased'];
  $: priorities = ['🔥 Очень хочу', '⭐ Было бы здорово', '💭 Просто мечта'];

  // Filter gifts based on search and filters
  $: filteredGifts = gifts.filter(gift => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesName = gift.name?.toLowerCase().includes(query);
      const matchesDesc = gift.description?.toLowerCase().includes(query);
      if (!matchesName && !matchesDesc) return false;
    }

    // Category filter
    if (selectedCategory && gift.category !== selectedCategory) return false;

    // Status filter
    if (selectedStatus && gift.status !== selectedStatus) return false;

    // Priority filter
    if (selectedPriority && gift.priority !== selectedPriority) return false;

    return true;
  });

  // Sort filtered gifts
  $: sortedGifts = [...filteredGifts].sort((a, b) => {
    switch (sortBy) {
      case 'priority':
        const priorityOrder = { '🔥 Очень хочу': 1, '⭐ Было бы здорово': 2, '💭 Просто мечта': 3 };
        const pa = priorityOrder[a.priority] || 4;
        const pb = priorityOrder[b.priority] || 4;
        if (pa !== pb) return pa - pb;
        return new Date(b.created_at) - new Date(a.created_at);

      case 'name':
        return a.name.localeCompare(b.name, 'ru');

      case 'created_at':
        return new Date(b.created_at) - new Date(a.created_at);

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

  function onGiftSaved() {
    showAddModal = false;
    showEditModal = false;
    showReserveModal = false;
    showDeleteModal = false;
    selectedGift = null;
    loadGifts();
  }
</script>

<div class="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950 transition-colors duration-300">
  <!-- Toast Container -->
  <ToastContainer />

  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
    <!-- Header -->
    <header class="flex items-center justify-between mb-6 sm:mb-8">
      <div class="flex items-center gap-3">
        <h1 class="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 dark:from-indigo-400 dark:via-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
          🎁 Wishlist
        </h1>
      </div>

      <div class="flex items-center gap-2 sm:gap-3">
        <!-- Theme Toggle -->
        <button
          on:click={() => theme.set(currentTheme === 'dark' ? 'light' : 'dark')}
          class="w-10 h-10 sm:w-auto sm:h-auto sm:px-3 sm:py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 transition-all duration-200 flex items-center justify-center sm:justify-start gap-2 text-slate-700 dark:text-slate-300 hover:scale-105 active:scale-95"
          title="{currentTheme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}"
        >
          <span class="text-xl">{currentTheme === 'dark' ? '🌙' : '☀️'}</span>
          <span class="hidden sm:inline text-sm font-medium">{currentTheme === 'dark' ? 'Тёмная' : 'Светлая'}</span>
        </button>

        <!-- Add Button -->
        <button
          on:click={openAddModal}
          class="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white px-3 sm:px-4 py-2.5 rounded-xl border border-indigo-500/50 shadow-lg shadow-indigo-500/20 transition-all duration-200 text-sm font-semibold hover:shadow-xl hover:shadow-indigo-500/30 hover:-translate-y-0.5 active:translate-y-0"
        >
          <span class="text-base">+</span>
          <span class="hidden sm:inline">Добавить</span>
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
          placeholder="🔍 Поиск по названию или описанию..."
          class="w-full px-4 py-3 pl-11 bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm border border-slate-300 dark:border-slate-700/50 rounded-xl text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all shadow-lg"
        />
      </div>

      <!-- Filters Row -->
      <div class="flex flex-wrap gap-2 sm:gap-3">
        <!-- Category Filter -->
        <select
          bind:value={selectedCategory}
          class="px-3 sm:px-4 py-2 bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm border border-slate-300 dark:border-slate-700/50 rounded-lg text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all hover:border-slate-400 dark:hover:border-slate-600/50"
        >
          <option value="">Все категории</option>
          {#each categories as cat}
            <option value={cat}>{cat}</option>
          {/each}
        </select>

        <!-- Status Filter -->
        <select
          bind:value={selectedStatus}
          class="px-3 sm:px-4 py-2 bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm border border-slate-300 dark:border-slate-700/50 rounded-lg text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all hover:border-slate-400 dark:hover:border-slate-600/50"
        >
          <option value="">Все статусы</option>
          <option value="available">✨ Доступен</option>
          <option value="reserved">🔒 Забронирован</option>
          <option value="purchased">✅ Куплен</option>
        </select>

        <!-- Priority Filter -->
        <select
          bind:value={selectedPriority}
          class="px-3 sm:px-4 py-2 bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm border border-slate-300 dark:border-slate-700/50 rounded-lg text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all hover:border-slate-400 dark:hover:border-slate-600/50"
        >
          <option value="">Все приоритеты</option>
          {#each priorities as prio}
            <option value={prio}>{prio}</option>
          {/each}
        </select>

        <!-- Sort By -->
        <select
          bind:value={sortBy}
          class="px-3 sm:px-4 py-2 bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm border border-slate-300 dark:border-slate-700/50 rounded-lg text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all hover:border-slate-400 dark:hover:border-slate-600/50"
        >
          <option value="priority">🔥 По приоритету</option>
          <option value="name">🔤 По названию</option>
          <option value="created_at">📅 По дате</option>
        </select>

        <!-- Clear Filters Button -->
        {#if searchQuery || selectedCategory || selectedStatus || selectedPriority || sortBy !== 'priority'}
          <button
            on:click={clearFilters}
            class="px-3 sm:px-4 py-2 bg-slate-200 dark:bg-slate-800/80 hover:bg-slate-300 dark:hover:bg-slate-700/80 backdrop-blur-sm text-slate-700 dark:text-slate-300 text-xs sm:text-sm rounded-lg border border-slate-300 dark:border-slate-700/50 transition-all hover:scale-105 active:scale-95"
          >
            ✕ Сбросить
          </button>
        {/if}
      </div>

      <!-- Results Count -->
      {#if filteredGifts.length !== gifts.length}
        <p class="text-xs sm:text-sm text-slate-600 dark:text-slate-400 flex items-center gap-2">
          <span class="inline-block w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
          Показано {sortedGifts.length} из {gifts.length} подарков
        </p>
      {/if}
    </div>

    <!-- Loading State -->
    {#if loading}
      <div class="flex items-center justify-center py-32">
        <div class="text-center">
          <div class="inline-block animate-spin rounded-full h-12 w-12 border-3 border-indigo-500 border-t-transparent mb-4"></div>
          <p class="text-slate-400">Загрузка...</p>
        </div>
      </div>
    {:else if gifts.length === 0}
      <!-- Empty State -->
      <div class="flex items-center justify-center py-32">
        <div class="text-center">
          <div class="text-6xl mb-4 opacity-20">🎁</div>
          <h3 class="text-xl font-semibold text-slate-300 mb-2">Список пуст</h3>
          <p class="text-slate-500 text-sm">Добавьте первый подарок</p>
        </div>
      </div>
    {:else if sortedGifts.length === 0}
      <!-- No Results -->
      <div class="flex items-center justify-center py-32">
        <div class="text-center">
          <div class="text-6xl mb-4 opacity-20">🔍</div>
          <h3 class="text-xl font-semibold text-slate-300 mb-2">Ничего не найдено</h3>
          <p class="text-slate-500 text-sm">Попробуйте изменить параметры поиска</p>
        </div>
      </div>
    {:else}
      <!-- Gifts Grid -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-5">
        {#each sortedGifts as gift, index (gift.id + gift.status)}
          <GiftCard
            {gift}
            {index}
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
{#if showAddModal}
  <AddGiftModal on:close={() => showAddModal = false} on:saved={onGiftSaved} />
{/if}

{#if showEditModal && selectedGift}
  <EditGiftModal
    gift={selectedGift}
    on:close={() => showEditModal = false}
    on:saved={onGiftSaved}
  />
{/if}

{#if showReserveModal && selectedGift}
  <ReserveModal
    gift={selectedGift}
    on:close={() => showReserveModal = false}
    on:saved={onGiftSaved}
  />
{/if}

{#if showDeleteModal && selectedGift}
  <DeleteModal
    gift={selectedGift}
    on:close={() => showDeleteModal = false}
    on:deleted={onGiftSaved}
  />
{/if}
