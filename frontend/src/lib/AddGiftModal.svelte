<script>
  import { createEventDispatcher } from 'svelte';
  import { fade, fly } from 'svelte/transition';
  import { toasts } from './stores/toasts.js';
  import { validators } from './utils/validation.js';
  import { t } from './utils/i18n.js';
  import { parseGift, getAdminPassword } from './utils/api.js';

  const dispatch = createEventDispatcher();

  let name = '';
  let description = '';
  let category = 'electronics';
  let priority = 'medium';
  let price = '';
  let link = '';
  let imageUrl = '';
  let loading = false;
  let errors = {};

  // AI autofill
  let aiText = '';
  let aiLoading = false;

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

  function validateForm() {
    errors = {};

    const nameError = validators.giftName(name);
    if (nameError) errors.name = nameError;

    const descError = validators.description(description);
    if (descError) errors.description = descError;

    const priceError = validators.price(price);
    if (priceError) errors.price = priceError;

    const linkError = validators.link(link);
    if (linkError) errors.link = linkError;

    const imageError = validators.imageUrl(imageUrl);
    if (imageError) errors.imageUrl = imageError;

    return Object.keys(errors).length === 0;
  }

  async function handleSubmit() {
    errors = {};

    if (!validateForm()) {
      return;
    }

    // Get admin password from localStorage
    const adminPassword = getAdminPassword();
    if (!adminPassword) {
      toasts.error('Сначала войдите в систему');
      dispatch('close');
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

      const response = await fetch('/api/gifts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Password': adminPassword
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const err = await response.json();
        toasts.error(err.error || $t('toasts.error'));
        return;
      }

      // Reset form
      name = '';
      description = '';
      category = 'electronics';
      priority = 'medium';
      price = '';
      link = '';
      imageUrl = '';

      toasts.success($t('toasts.added'));
      dispatch('saved');
    } catch (err) {
      toasts.error($t('toasts.error'));
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

  async function handleAIFill() {
    if (!aiText.trim()) {
      toasts.error($t('validation.required'));
      return;
    }

    aiLoading = true;
    errors = {};

    try {
      const result = await parseGift(aiText.trim());

      // Fill form with AI results
      if (result.name) name = result.name;
      if (result.description) description = result.description;
      if (result.category) category = result.category;
      if (result.priority) priority = result.priority;
      if (result.price) price = result.price;
      if (result.link) link = result.link;
      if (result.image_url) imageUrl = result.image_url;

      // Clear AI input
      aiText = '';

      toasts.success($t('toasts.added') + ' AI!');
    } catch (err) {
      toasts.error($t('modals.add.aiError') + ': ' + err.message);
    } finally {
      aiLoading = false;
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

<div
  class="modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
  transition:fade={{ duration: 200 }}
  on:click={handleClickOutside}
>
  <div
    class="bg-slate-800 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-700/50 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
    transition:fly={{ y: 50, opacity: 0, duration: 300 }}
    role="dialog"
    aria-modal="true"
    aria-labelledby="modal-title"
    tabindex="-1"
  >
    <!-- Header -->
    <div class="sticky top-0 z-10 bg-slate-800/95 backdrop-blur-xl px-8 py-6 border-b border-slate-700/50">
      <h2 id="modal-title" class="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-pink-400 bg-clip-text text-transparent">
        ➕ {$t('modals.add.title')}
      </h2>
    </div>

    <!-- Body -->
    <div class="p-8 space-y-6">
      <!-- AI Autofill Section -->
      <div class="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/30 rounded-xl p-4">
        <h3 class="text-sm font-semibold text-purple-300 mb-3">{$t('modals.add.aiSection')}</h3>
        <div class="flex gap-2">
          <input
            type="text"
            bind:value={aiText}
            placeholder={$t('modals.add.aiInputPlaceholder')}
            disabled={aiLoading}
            on:keydown={(e) => e.key === 'Enter' && handleAIFill()}
            class="flex-1 px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all disabled:opacity-50"
          />
          <button
            on:click={handleAIFill}
            disabled={aiLoading || !aiText.trim()}
            class="px-4 py-2 rounded-lg font-semibold text-sm bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {aiLoading ? $t('modals.add.aiFillButtonLoading') : $t('modals.add.aiFillButton')}
          </button>
        </div>
      </div>

      <!-- Name -->
      <div>
        <label for="gift-name" class="block text-sm font-semibold text-slate-300 mb-2">{$t('modals.add.name')} *</label>
        <input
          id="gift-name"
          type="text"
          bind:value={name}
          placeholder={$t('modals.add.namePlaceholder')}
          class="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
          class:border-red-500={errors.name}
        />
        {#if errors.name}
          <p class="mt-1 text-sm text-red-400">{errors.name}</p>
        {/if}
      </div>

      <!-- Category & Priority -->
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label for="gift-category" class="block text-sm font-semibold text-slate-300 mb-2">{$t('modals.add.category')}</label>
          <select
            id="gift-category"
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
          <label for="gift-priority" class="block text-sm font-semibold text-slate-300 mb-2">{$t('modals.add.priority')}</label>
          <select
            id="gift-priority"
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
        <label for="gift-description" class="block text-sm font-semibold text-slate-300 mb-2">{$t('modals.add.description')}</label>
        <textarea
          id="gift-description"
          bind:value={description}
          rows="3"
          placeholder={$t('modals.add.descriptionPlaceholder')}
          class="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none"
          class:border-red-500={errors.description}
        ></textarea>
        {#if errors.description}
          <p class="mt-1 text-sm text-red-400">{errors.description}</p>
        {/if}
      </div>

      <!-- Price & Link -->
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label for="gift-price" class="block text-sm font-semibold text-slate-300 mb-2">{$t('modals.add.price')}</label>
          <input
            id="gift-price"
            type="text"
            bind:value={price}
            placeholder={$t('modals.add.pricePlaceholder')}
            class="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
          />
        </div>

        <div>
          <label for="gift-link" class="block text-sm font-semibold text-slate-300 mb-2">{$t('modals.add.link')}</label>
          <input
            id="gift-link"
            type="url"
            bind:value={link}
            placeholder={$t('modals.add.linkPlaceholder')}
            class="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            class:border-red-500={errors.link}
          />
          {#if errors.link}
            <p class="mt-1 text-sm text-red-400">{errors.link}</p>
          {/if}
        </div>
      </div>

      <!-- Image URL -->
      <div>
        <label for="gift-image" class="block text-sm font-semibold text-slate-300 mb-2">{$t('modals.add.image')}</label>
        <input
          id="gift-image"
          type="url"
          bind:value={imageUrl}
          placeholder={$t('modals.add.imagePlaceholder')}
          class="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
          class:border-red-500={errors.imageUrl}
        />
        {#if errors.imageUrl}
          <p class="mt-1 text-sm text-red-400">{errors.imageUrl}</p>
        {/if}
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
