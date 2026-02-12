<script>
  import { createEventDispatcher } from 'svelte';
  import { fade, fly, scale } from 'svelte/transition';
  import { quintOut } from 'svelte/easing';
  import { toasts } from './stores/toasts.js';
  import { locale } from './stores/locale.js';
  import { validators } from './utils/validation.js';
  import { t } from './utils/i18n.js';
  import { parseGift, getAdminPassword } from './utils/api.js';
  import { designSystem } from './utils/design-system.js';

  // @ts-ignore - Ignore svelteHTML type errors from node_modules
  import { colors, typography } from './utils/design-system.js';

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
    { code: 'creativity', name: $t('categories.creativity') },
  ];

  $: priorities = [
    { code: 'hot', name: $t('priorities.hot') },
    { code: 'medium', name: $t('priorities.medium') },
    { code: 'low', name: $t('priorities.low') },
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
        priority_code: priority,
      };

      if (price.trim()) payload.price = price.trim();
      if (link.trim()) payload.link = link.trim();
      if (imageUrl.trim()) payload.image_url = imageUrl.trim();

      const response = await fetch('/api/gifts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Password': adminPassword,
        },
        body: JSON.stringify(payload),
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
    } catch {
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

  function handleBackdropKeydown(event) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
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
      const result = await parseGift(aiText.trim(), $locale);

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
    } catch {
      toasts.error($t('modals.add.aiError'));
    } finally {
      aiLoading = false;
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

<div
  class="modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
  transition:scale={{ duration: 200, start: 0.95, easing: quintOut }}
  on:click={handleClickOutside}
  on:keydown={handleBackdropKeydown}
  role="button"
  tabindex="-1"
  aria-label="Close modal"
>
  <div
    class="bg-ivory dark:bg-dark-bg backdrop-blur-xl rounded-modal shadow-raised border border-black/[0.08] dark:border-white/[0.08] w-full max-w-[var(--width-modal-lg)] max-h-[90vh] overflow-y-auto scrollbar-hide"
    transition:fly={{ y: 50, opacity: 0, duration: 300 }}
    role="dialog"
    aria-modal="true"
    aria-labelledby="modal-title"
    tabindex="-1"
  >
    <!-- Header -->
    <div
      class="relative sticky top-0 z-10 bg-ivory/95 dark:bg-dark-bg/95 backdrop-blur-xl border-b border-black/[0.08] dark:border-white/[0.08] px-7 py-5"
    >
      <div class="flex items-center justify-between">
        <h2
          id="modal-title"
          class="{designSystem.text['2xl']} {designSystem.text.weight.medium} {designSystem.text.tracking.tighter} text-graphite dark:text-dark-text"
        >
          {$t('modals.add.title')}
        </h2>
        <button
          on:click={() => dispatch('close')}
          class="w-8 h-8 rounded-full {designSystem.color.neutral.background.surface} {designSystem.color.neutral.background.surfaceDark} hover:bg-red-100 dark:hover:bg-red-900/30 border {designSystem.color.neutral.border.DEFAULT} dark:border-white/[0.08] hover:border-red-400 dark:hover:border-red-700/50 flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95"
          aria-label="Close"
        >
          ✕
        </button>
      </div>
    </div>

    <!-- Body -->
    <div class="p-7 space-y-5">
      <!-- AI Autofill Section -->
      <div
        class="bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-200/50 dark:border-indigo-700/30 rounded-[4px] p-4"
      >
        <h3 class="{designSystem.text.xs} {designSystem.text.weight.semibold} {designSystem.text.tracking.widest} uppercase text-indigo-700 dark:text-indigo-300 mb-3">{$t('modals.add.aiSection')}</h3>
        <div class="flex gap-2">
          <input
            type="text"
            bind:value={aiText}
            placeholder={$t('modals.add.aiInputPlaceholder')}
            disabled={aiLoading}
            on:keydown={(e) => e.key === 'Enter' && handleAIFill()}
            class="flex-1 px-4 py-2 bg-white/80 dark:bg-dark-bg/80 border {designSystem.color.neutral.border.DEFAULT} dark:border-white/[0.08] rounded-none text-graphite dark:text-dark-text placeholder-black/40 dark:placeholder-white/40 {designSystem.text.sm} focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black/10 transition-all disabled:opacity-50"
          />
          <button
            on:click={handleAIFill}
            disabled={aiLoading || !aiText.trim()}
            class="{designSystem.text.spacing.button} rounded-none {designSystem.text.weight.medium} {designSystem.text.tracking.tighter} {designSystem.text.sm} bg-graphite dark:bg-black hover:bg-black dark:hover:bg-black text-white shadow-editorial transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {aiLoading ? $t('modals.add.aiFillButtonLoading') : $t('modals.add.aiFillButton')}
          </button>
        </div>
      </div>

      <!-- Name -->
      <div>
        <label for="gift-name" class="block {designSystem.text.combinations.label} text-black/70 dark:text-white/70 mb-2"
          >{$t('modals.add.name')} *</label
        >
        <input
          id="gift-name"
          type="text"
          bind:value={name}
          placeholder={$t('modals.add.namePlaceholder')}
          class="w-full {designSystem.text.spacing.input} bg-white/80 dark:bg-dark-bg/80 border {designSystem.color.neutral.border.DEFAULT} dark:border-white/[0.08] rounded-none text-graphite dark:text-dark-text placeholder-black/40 dark:placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black/10 transition-all"
          class:border-red-500={errors.name}
        />
        {#if errors.name}
          <p class="mt-1 text-sm text-red-400">{errors.name}</p>
        {/if}
      </div>

      <!-- Category & Priority -->
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label for="gift-category" class="block {designSystem.text.combinations.label} text-black/70 dark:text-white/70 mb-[7px]"
            >{$t('modals.add.category')}</label
          >
          <select
            id="gift-category"
            bind:value={category}
            class="w-full {designSystem.text.spacing.input} bg-white/80 dark:bg-dark-bg/80 border {designSystem.color.neutral.border.DEFAULT} dark:border-white/[0.08] rounded-none text-graphite dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black/10 transition-all"
          >
            <option value="">{$t('modals.add.category')}</option>
            {#each categories as cat (cat.code)}
              <option value={cat.code}>{cat.name}</option>
            {/each}
          </select>
        </div>

        <div>
          <label for="gift-priority" class="block {designSystem.text.combinations.label} text-black/70 dark:text-white/70 mb-[7px]"
            >{$t('modals.add.priority')}</label
          >
          <select
            id="gift-priority"
            bind:value={priority}
            class="w-full {designSystem.text.spacing.input} bg-white/80 dark:bg-dark-bg/80 border {designSystem.color.neutral.border.DEFAULT} dark:border-white/[0.08] rounded-none text-graphite dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black/10 transition-all"
          >
            {#each priorities as prio (prio.code)}
              <option value={prio.code}>{prio.name}</option>
            {/each}
          </select>
        </div>
      </div>

      <!-- Description -->
      <div>
        <label for="gift-description" class="block {designSystem.text.combinations.label} text-black/70 dark:text-white/70 mb-[7px]"
          >{$t('modals.add.description')}</label
        >
        <textarea
          id="gift-description"
          bind:value={description}
          rows="3"
          placeholder={$t('modals.add.descriptionPlaceholder')}
          class="w-full {designSystem.text.spacing.input} bg-white/80 dark:bg-dark-bg/80 border {designSystem.color.neutral.border.DEFAULT} dark:border-white/[0.08] rounded-none text-graphite dark:text-dark-text placeholder-black/40 dark:placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black/10 transition-all resize-none"
          class:border-red-500={errors.description}
        ></textarea>
        {#if errors.description}
          <p class="mt-1 text-sm text-red-400">{errors.description}</p>
        {/if}
      </div>

      <!-- Price & Link -->
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label for="gift-price" class="block {designSystem.text.combinations.label} text-black/70 dark:text-white/70 mb-[7px]"
            >{$t('modals.add.price')}</label
          >
          <input
            id="gift-price"
            type="text"
            bind:value={price}
            placeholder={$t('modals.add.pricePlaceholder')}
            class="w-full {designSystem.text.spacing.input} bg-white/80 dark:bg-dark-bg/80 border {designSystem.color.neutral.border.DEFAULT} dark:border-white/[0.08] rounded-none text-graphite dark:text-dark-text placeholder-black/40 dark:placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black/10 transition-all"
          />
        </div>

        <div>
          <label for="gift-link" class="block {designSystem.text.combinations.label} text-black/70 dark:text-white/70 mb-[7px]"
            >{$t('modals.add.link')}</label
          >
          <input
            id="gift-link"
            type="url"
            bind:value={link}
            placeholder={$t('modals.add.linkPlaceholder')}
            class="w-full {designSystem.text.spacing.input} bg-white/80 dark:bg-dark-bg/80 border {designSystem.color.neutral.border.DEFAULT} dark:border-white/[0.08] rounded-none text-graphite dark:text-dark-text placeholder-black/40 dark:placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black/10 transition-all"
            class:border-red-500={errors.link}
          />
          {#if errors.link}
            <p class="mt-1 text-sm text-red-400">{errors.link}</p>
          {/if}
        </div>
      </div>

      <!-- Image URL -->
      <div>
        <label for="gift-image" class="block {designSystem.text.combinations.label} text-black/70 dark:text-white/70 mb-[7px]"
          >{$t('modals.add.image')}</label
        >
        <input
          id="gift-image"
          type="url"
          bind:value={imageUrl}
          placeholder={$t('modals.add.imagePlaceholder')}
          class="w-full {designSystem.text.spacing.input} bg-white/80 dark:bg-dark-bg/80 border {designSystem.color.neutral.border.DEFAULT} dark:border-white/[0.08] rounded-none text-graphite dark:text-dark-text placeholder-black/40 dark:placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black/10 transition-all"
          class:border-red-500={errors.imageUrl}
        />
        {#if errors.imageUrl}
          <p class="mt-1 text-sm text-red-400">{errors.imageUrl}</p>
        {/if}
      </div>
    </div>

    <!-- Footer -->
    <div
      class="sticky bottom-0 bg-ivory/95 dark:bg-dark-bg/95 backdrop-blur-xl px-7 py-5 border-t {designSystem.color.neutral.border.DEFAULT} dark:border-white/[0.08] flex gap-3 justify-end"
    >
      <button
        on:click={() => dispatch('close')}
        class="h-10 px-4 rounded-full font-medium {designSystem.color.secondary.bg} {designSystem.color.secondary.bgDark} {designSystem.color.secondary.text} {designSystem.color.secondary.textDark} {designSystem.color.secondary.hover} {designSystem.color.secondary.hoverDark} transition-all duration-200"
      >
        {$t('actions.cancel')}
      </button>
      <button
        on:click={handleSubmit}
        disabled={loading}
        class="h-10 px-4 rounded-full font-medium {designSystem.color.primary.bg} {designSystem.color.primary.bgDark} {designSystem.color.primary.text} {designSystem.color.primary.textDark} {designSystem.color.primary.hover} {designSystem.color.primary.hoverDark} transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? $t('app.loading') : $t('actions.save')}
      </button>
    </div>
  </div>
</div>
