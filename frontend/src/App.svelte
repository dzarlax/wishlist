<script>
  import { onMount } from 'svelte';
  import GiftCard from './lib/GiftCard.svelte';
  import AddGiftModal from './lib/AddGiftModal.svelte';
  import EditGiftModal from './lib/EditGiftModal.svelte';
  import ReserveModal from './lib/ReserveModal.svelte';
  import DeleteModal from './lib/DeleteModal.svelte';

  let gifts = [];
  let loading = true;
  let showAddModal = false;
  let showEditModal = false;
  let showReserveModal = false;
  let showDeleteModal = false;

  let selectedGift = null;

  onMount(async () => {
    await loadGifts();
  });

  async function loadGifts() {
    try {
      const response = await fetch('/api/gifts');
      gifts = await response.json();
    } catch (error) {
      console.error('Error loading gifts:', error);
    } finally {
      loading = false;
    }
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

<div class="min-h-screen bg-slate-950">
  <div class="max-w-7xl mx-auto px-6 py-8">
    <!-- Header -->
    <header class="flex items-center justify-between mb-10">
      <h1 class="text-2xl font-semibold text-white">
        🎁 Wishlist
      </h1>

      <button
        on:click={openAddModal}
        class="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-700 transition-colors text-sm"
      >
        <span class="text-base">+</span>
        <span>Добавить</span>
      </button>
    </header>

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
    {:else}
      <!-- Gifts Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {#each gifts as gift, index}
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

<style>
  @keyframes gradient-x {
    0%, 100% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
  }

  @keyframes pulse-slow {
    0%, 100% { opacity: 0.3; }
    50% { opacity: 0.6; }
  }

  .animate-gradient-x {
    background-size: 200% 200%;
    animation: gradient-x 5s ease infinite;
  }

  .animate-pulse-slow {
    animation: pulse-slow 10s ease-in-out infinite;
  }

  .bg-gradient-radial {
    background: radial-gradient(circle, var(--tw-gradient-stops));
  }
</style>
