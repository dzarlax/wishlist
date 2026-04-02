<script>
  import { createEventDispatcher, onMount } from 'svelte';
  import { fade, fly, scale } from 'svelte/transition';
  import { quintOut } from 'svelte/easing';
  import { t } from './utils/i18n.js';
  import { locale } from './stores/locale.js';
  import { updateUserGift, fetchCategories, fetchPriorities } from './utils/api.js';
  import { toasts } from './stores/toasts.js';
  import { designSystem } from './utils/design-system.js';

  export let gift;
  export let userSlug = null;

  const dispatch = createEventDispatcher();

  let name = '';
  let description = '';
  let category = '';
  let priority = '';
  let price = '';
  let link = '';
  let imageUrl = '';
  let loading = false;
  let error = '';

  let categories = [];
  let priorities = [];

  async function loadReferenceData() {
    try {
      [categories, priorities] = await Promise.all([
        fetchCategories($locale),
        fetchPriorities($locale)
      ]);
    } catch {
      // ignore
    }
  }

  $: $locale, loadReferenceData();

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

      await updateUserGift(userSlug, gift.id, payload);

      dispatch('saved');
    } catch (e) {
      error = e.message || $t('toasts.error');
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
    // Don't close if focus is on an input element
    const target = event.target;
    const isInput = target.tagName === 'INPUT' ||
                    target.tagName === 'TEXTAREA' ||
                    target.tagName === 'SELECT' ||
                    target.isContentEditable;
    if (isInput) return;

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      dispatch('close');
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
    aria-labelledby="edit-modal-title"
    tabindex="-1"
  >
    <!-- Header -->
    <div
      class="relative sticky top-0 z-10 bg-ivory/95 dark:bg-dark-bg/95 backdrop-blur-xl border-b {designSystem.color.neutral.border.DEFAULT} dark:border-white/[0.08] px-7 py-5"
    >
      <div class="flex items-center justify-between">
        <h2
          id="edit-modal-title"
          class="{designSystem.text['2xl']} {designSystem.text.weight.medium} {designSystem.text.tracking.tighter} text-graphite dark:text-dark-text"
        >
          {$t('modals.edit.title')}
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
      <!-- Error Message -->
      {#if error}
        <div
          class="bg-red-500/10 border border-red-500/30 rounded-[4px] px-4 py-3 text-sm text-red-300"
        >
          {error}
        </div>
      {/if}

      <!-- Name -->
      <div>
        <label for="edit-gift-name" class="block {designSystem.text.combinations.label} text-black/70 dark:text-white/70 mb-2"
          >{$t('modals.add.name')} *</label
        >
        <input
          id="edit-gift-name"
          type="text"
          bind:value={name}
          class="w-full {designSystem.text.spacing.input} bg-white/80 dark:bg-dark-bg/80 border {designSystem.color.neutral.border.DEFAULT} dark:border-white/[0.08] rounded-none text-graphite dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black/10 transition-all"
        />
      </div>

      <!-- Category & Priority -->
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label for="edit-gift-category" class="block {designSystem.text.combinations.label} text-black/70 dark:text-white/70 mb-[7px]"
            >{$t('modals.add.category')}</label
          >
          <select
            id="edit-gift-category"
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
          <label for="edit-gift-priority" class="block {designSystem.text.combinations.label} text-black/70 dark:text-white/70 mb-[7px]"
            >{$t('modals.add.priority')}</label
          >
          <select
            id="edit-gift-priority"
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
        <label for="edit-gift-description" class="block {designSystem.text.combinations.label} text-black/70 dark:text-white/70 mb-[7px]"
          >{$t('modals.add.description')}</label
        >
        <textarea
          id="edit-gift-description"
          bind:value={description}
          rows="3"
          class="w-full {designSystem.text.spacing.input} bg-white/80 dark:bg-dark-bg/80 border {designSystem.color.neutral.border.DEFAULT} dark:border-white/[0.08] rounded-none text-graphite dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black/10 transition-all resize-none"
        ></textarea>
      </div>

      <!-- Price & Link -->
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label for="edit-gift-price" class="block {designSystem.text.combinations.label} text-black/70 dark:text-white/70 mb-[7px]"
            >{$t('modals.add.price')}</label
          >
          <input
            id="edit-gift-price"
            type="text"
            bind:value={price}
            class="w-full {designSystem.text.spacing.input} bg-white/80 dark:bg-dark-bg/80 border {designSystem.color.neutral.border.DEFAULT} dark:border-white/[0.08] rounded-none text-graphite dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black/10 transition-all"
          />
        </div>

        <div>
          <label for="edit-gift-link" class="block {designSystem.text.combinations.label} text-black/70 dark:text-white/70 mb-[7px]"
            >{$t('modals.add.link')}</label
          >
          <input
            id="edit-gift-link"
            type="url"
            bind:value={link}
            class="w-full {designSystem.text.spacing.input} bg-white/80 dark:bg-dark-bg/80 border {designSystem.color.neutral.border.DEFAULT} dark:border-white/[0.08] rounded-none text-graphite dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black/10 transition-all"
          />
        </div>
      </div>

      <!-- Image URL -->
      <div>
        <label for="edit-gift-image" class="block {designSystem.text.combinations.label} text-black/70 dark:text-white/70 mb-[7px]"
          >{$t('modals.add.image')}</label
        >
        <input
          id="edit-gift-image"
          type="url"
          bind:value={imageUrl}
          class="w-full {designSystem.text.spacing.input} bg-white/80 dark:bg-dark-bg/80 border {designSystem.color.neutral.border.DEFAULT} dark:border-white/[0.08] rounded-none text-graphite dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black/10 transition-all"
        />
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
