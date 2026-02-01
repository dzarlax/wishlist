<script>
  import { createEventDispatcher, onMount } from 'svelte';
  import { fade, fly } from 'svelte/transition';
  import { t } from './utils/i18n.js';

  export let gift;

  const dispatch = createEventDispatcher();

  let name = '';
  let description = '';
  let category = '';
  let priority = '';
  let price = '';
  let link = '';
  let imageUrl = '';
  let adminPassword = '';
  let loading = false;
  let error = '';

  $: categories = [
    { code: 'electronics', name: $t('categories.electronics') },
    { code: 'home', name: $t('categories.home') },
    { code: 'accessories', name: $t('categories.accessories') },
    { code: 'education', name: $t('categories.education') },
    { code: 'games', name: $t('categories.games') },
    { code: 'clothing', name: $t('categories.clothing') },
    { code: 'sports', name: $t('categories.sports') },
    { code: 'creativity', name: $t('categories.creativity') }
  ];

  $: priorities = [
    { code: 'hot', name: $t('priorities.hot') },
    { code: 'medium', name: $t('priorities.medium') },
    { code: 'low', name: $t('priorities.low') }
  ];

  onMount(() => {
    name = gift.name;
    description = gift.description || '';
    // Use category_code if available, otherwise map from category name
    if (gift.category_code) {
      category = gift.category_code;
    } else if (gift.category) {
      // Map category name to code
      const categoryMapping = $t('categoryMapping');
      category = categoryMapping[gift.category] || 'electronics';
    } else {
      category = 'electronics';
    }
    // Use priority_code if available, otherwise map from priority name
    if (gift.priority_code) {
      priority = gift.priority_code;
    } else if (gift.priority) {
      // Map priority name to code
      const priorityMapping = $t('priorityMapping');
      priority = priorityMapping[gift.priority] || 'medium';
    } else {
      priority = 'medium';
    }
    price = gift.price || '';
    link = gift.link || '';
    imageUrl = gift.image_url || '';
  });

  async function handleSubmit() {
    error = '';

    if (!name.trim()) {
      error = 'Введите название подарка';
      return;
    }

    if (!adminPassword) {
      error = 'Введите пароль администратора';
      return;
    }

    loading = true;

    try {
      const payload = {
        name: name.trim(),
        description: description.trim(),
        category_code: category,
        priority_code: priority
      };

      if (price.trim()) payload.price = price.trim();
      if (link.trim()) payload.link = link.trim();
      if (imageUrl.trim()) payload.image_url = imageUrl.trim();

      const response = await fetch(`/api/gifts/${gift.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Password': adminPassword
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const err = await response.json();
        error = err.error || $t('toasts.error');
        return;
      }

      dispatch('saved');
    } catch (err) {
      error = $t('toasts.error');
    } finally {
      loading = false;
    }
  }

  function handleClickOutside(event) {
    if (event.target.classList.contains('modal-backdrop')) {
      dispatch('close');
    }
  }

  function handleKeydown(event) {
    if (event.key === 'Escape') {
      dispatch('close');
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

<div
  class="modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
  transition:fade={{ duration: 200 }}
  on:click={handleClickOutside}
  role="dialog"
  aria-modal="true"
  aria-labelledby="edit-modal-title"
>
  <div
    class="bg-slate-800 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-700/50 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
    transition:fly={{ y: 50, opacity: 0, duration: 300 }}
  >
    <!-- Header -->
    <div class="sticky top-0 z-10 bg-slate-800/95 backdrop-blur-xl px-8 py-6 border-b border-slate-700/50">
      <h2 id="edit-modal-title" class="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-pink-400 bg-clip-text text-transparent">
        ✏️ {$t('modals.edit.title')}
      </h2>
    </div>

    <!-- Body -->
    <div class="p-8 space-y-6">
      <!-- Error Message -->
      {#if error}
        <div class="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      {/if}

      <!-- Name -->
      <div>
        <label for="edit-gift-name" class="block text-sm font-semibold text-slate-300 mb-2">{$t('modals.add.name')} *</label>
        <input
          id="edit-gift-name"
          type="text"
          bind:value={name}
          class="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
        />
      </div>

      <!-- Category & Priority -->
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label for="edit-gift-category" class="block text-sm font-semibold text-slate-300 mb-2">{$t('modals.add.category')}</label>
          <select
            id="edit-gift-category"
            bind:value={category}
            class="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
          >
            <option value="">{$t('modals.add.category')}</option>
            {#each categories as cat}
              <option value={cat.code}>{cat.name}</option>
            {/each}
          </select>
        </div>

        <div>
          <label for="edit-gift-priority" class="block text-sm font-semibold text-slate-300 mb-2">{$t('modals.add.priority')}</label>
          <select
            id="edit-gift-priority"
            bind:value={priority}
            class="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
          >
            {#each priorities as prio}
              <option value={prio.code}>{prio.name}</option>
            {/each}
          </select>
        </div>
      </div>

      <!-- Description -->
      <div>
        <label for="edit-gift-description" class="block text-sm font-semibold text-slate-300 mb-2">{$t('modals.add.description')}</label>
        <textarea
          id="edit-gift-description"
          bind:value={description}
          rows="3"
          class="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none"
        ></textarea>
      </div>

      <!-- Price & Link -->
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label for="edit-gift-price" class="block text-sm font-semibold text-slate-300 mb-2">{$t('modals.add.price')}</label>
          <input
            id="edit-gift-price"
            type="text"
            bind:value={price}
            class="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
          />
        </div>

        <div>
          <label for="edit-gift-link" class="block text-sm font-semibold text-slate-300 mb-2">{$t('modals.add.link')}</label>
          <input
            id="edit-gift-link"
            type="url"
            bind:value={link}
            class="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
          />
        </div>
      </div>

      <!-- Image URL -->
      <div>
        <label for="edit-gift-image" class="block text-sm font-semibold text-slate-300 mb-2">{$t('modals.add.image')}</label>
        <input
          id="edit-gift-image"
          type="url"
          bind:value={imageUrl}
          class="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
        />
      </div>

      <!-- Admin Password -->
      <div>
        <label for="edit-admin-password" class="block text-sm font-semibold text-slate-300 mb-2">🔒 {$t('validation.adminPassword')} *</label>
        <input
          id="edit-admin-password"
          type="password"
          bind:value={adminPassword}
          placeholder="••••••••"
          class="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
        />
      </div>
    </div>

    <!-- Footer -->
    <div class="sticky bottom-0 bg-slate-800/95 backdrop-blur-xl px-8 py-6 border-t border-slate-700/50 flex gap-3 justify-end">
      <button
        on:click={() => dispatch('close')}
        class="px-6 py-3 rounded-xl font-semibold text-slate-300 hover:text-white bg-slate-700/50 hover:bg-slate-700 border border-slate-600/50 transition-all duration-300"
      >
        {$t('actions.cancel')}
      </button>
      <button
        on:click={handleSubmit}
        disabled={loading}
        class="px-6 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-indigo-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 transition-all duration-300 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
      >
        {loading ? $t('app.loading') : $t('actions.save')}
      </button>
    </div>
  </div>
</div>
