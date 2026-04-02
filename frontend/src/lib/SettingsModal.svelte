<script>
  import { createEventDispatcher, onMount } from 'svelte';
  import { fly, scale } from 'svelte/transition';
  import { quintOut } from 'svelte/easing';
  import { locale } from './stores/locale.js';
  import { toasts } from './stores/toasts.js';
  import { t } from './utils/i18n.js';
  import { designSystem } from './utils/design-system.js';
  import {
    fetchCategories, fetchPriorities,
    createCategory, updateCategory, deleteCategory,
    createPriority, updatePriority, deletePriority,
    translateText, updateProfile, changePassword
  } from './utils/api.js';
  import { auth } from './stores/auth.js';

  const dispatch = createEventDispatcher();

  let activeTab = 'categories';
  let categories = [];
  let priorities = [];
  let loading = true;

  // Edit state
  let editingItem = null;
  let editForm = { code: '', emoji: '', sort_order: 0, name_ru: '', name_en: '', name_sr: '' };
  let saving = false;
  let translating = false;

  // Profile state
  let profileEmail = '';
  let currentPassword = '';
  let newPassword = '';
  let confirmPassword = '';
  let profileSaving = false;
  let passwordSaving = false;

  let authUser = null;
  auth.user.subscribe(val => { authUser = val; });

  onMount(() => {
    loadData();
    if (authUser) {
      profileEmail = authUser.email || '';
    }
  });

  async function loadData() {
    loading = true;
    try {
      [categories, priorities] = await Promise.all([
        fetchCategories($locale),
        fetchPriorities($locale)
      ]);
    } catch (e) {
      toasts.error(e.message);
    } finally {
      loading = false;
    }
  }

  function startEdit(type, item = null) {
    editingItem = { type, code: item?.code || null };
    if (item) {
      editForm = {
        code: item.code,
        emoji: item.emoji || '',
        sort_order: item.sort_order || 0,
        name_ru: item.name_ru || '',
        name_en: item.name_en || '',
        name_sr: item.name_sr || ''
      };
    } else {
      editForm = { code: '', emoji: '📦', sort_order: 0, name_ru: '', name_en: '', name_sr: '' };
    }
  }

  function cancelEdit() {
    editingItem = null;
  }

  async function saveItem() {
    if (!editForm.code.trim() || !editForm.name_ru.trim()) {
      toasts.error('Code and Russian name are required');
      return;
    }

    saving = true;
    try {
      const data = { ...editForm, sort_order: parseInt(editForm.sort_order) || 0 };
      const isNew = editingItem.code === null;

      if (editingItem.type === 'category') {
        if (isNew) {
          await createCategory(data);
        } else {
          await updateCategory(editingItem.code, data);
        }
      } else {
        if (isNew) {
          await createPriority(data);
        } else {
          await updatePriority(editingItem.code, data);
        }
      }

      editingItem = null;
      await loadData();
      dispatch('updated');
    } catch (e) {
      toasts.error(e.message);
    } finally {
      saving = false;
    }
  }

  async function deleteItem(type, code) {
    try {
      if (type === 'category') {
        await deleteCategory(code);
      } else {
        await deletePriority(code);
      }
      await loadData();
      dispatch('updated');
    } catch (e) {
      toasts.error(e.message);
    }
  }

  async function aiTranslate() {
    // Find source: first non-empty name field
    let sourceLocale = null;
    let sourceText = null;

    if (editForm.name_ru) { sourceLocale = 'ru'; sourceText = editForm.name_ru; }
    else if (editForm.name_en) { sourceLocale = 'en'; sourceText = editForm.name_en; }
    else if (editForm.name_sr) { sourceLocale = 'sr'; sourceText = editForm.name_sr; }

    if (!sourceText) {
      toasts.error('Fill in at least one name to translate');
      return;
    }

    const targets = ['ru', 'en', 'sr'].filter(l => l !== sourceLocale);

    translating = true;
    try {
      const result = await translateText(sourceText, sourceLocale, targets);
      for (const [lang, text] of Object.entries(result)) {
        const key = `name_${lang}`;
        if (!editForm[key]) {
          editForm[key] = text;
        }
      }
      editForm = editForm; // trigger reactivity
      toasts.success('Translations filled');
    } catch (e) {
      toasts.error(e.message || 'Translation failed');
    } finally {
      translating = false;
    }
  }

  function handleClickOutside(event) {
    if (event.target.classList.contains('modal-backdrop')) {
      dispatch('close');
    }
  }

  function handleKeydown(event) {
    if (event.key === 'Escape') {
      if (editingItem) {
        cancelEdit();
      } else {
        dispatch('close');
      }
    }
  }

  async function saveProfile() {
    profileSaving = true;
    try {
      const updated = await updateProfile({ email: profileEmail.trim() || null });
      auth.user.set ? null : null; // auth store doesn't expose set directly
      toasts.success($t('settings.profileUpdated'));
    } catch (e) {
      toasts.error(e.message);
    } finally {
      profileSaving = false;
    }
  }

  async function savePassword() {
    if (newPassword !== confirmPassword) {
      toasts.error($t('settings.passwordMismatch'));
      return;
    }
    passwordSaving = true;
    try {
      await changePassword(currentPassword, newPassword);
      toasts.success($t('settings.passwordChanged'));
      currentPassword = '';
      newPassword = '';
      confirmPassword = '';
    } catch (e) {
      toasts.error(e.message);
    } finally {
      passwordSaving = false;
    }
  }

  async function moveItem(type, code, direction) {
    const list = type === 'category' ? categories : priorities;
    const idx = list.findIndex(i => i.code === code);
    if (idx < 0) return;

    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= list.length) return;

    const item = list[idx];
    const swap = list[swapIdx];

    // Swap sort_order values
    const updateFn = type === 'category' ? updateCategory : updatePriority;
    try {
      await Promise.all([
        updateFn(item.code, { ...item, sort_order: swap.sort_order }),
        updateFn(swap.code, { ...swap, sort_order: item.sort_order })
      ]);
      await loadData();
      dispatch('updated');
    } catch (e) {
      toasts.error(e.message);
    }
  }

  $: currentList = activeTab === 'categories' ? categories : priorities;
  $: currentType = activeTab === 'categories' ? 'category' : 'priority';
</script>

<svelte:window on:keydown={handleKeydown} />

<div
  class="modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
  transition:scale={{ duration: 200, start: 0.95, easing: quintOut }}
  on:click={handleClickOutside}
  role="button"
  tabindex="-1"
  aria-label="Close modal"
>
  <div
    class="bg-ivory dark:bg-dark-bg backdrop-blur-xl rounded-modal shadow-raised border border-black/[0.08] dark:border-white/[0.08] w-full max-w-2xl max-h-[85vh] flex flex-col"
    transition:fly={{ y: 50, opacity: 0, duration: 300 }}
    role="dialog"
    aria-modal="true"
    tabindex="-1"
  >
    <!-- Header -->
    <div class="px-7 py-5 border-b border-black/[0.08] dark:border-white/[0.08] flex items-center justify-between flex-shrink-0">
      <h2 class="{designSystem.text['2xl']} {designSystem.text.weight.medium} {designSystem.text.tracking.tighter} text-graphite dark:text-dark-text">
        ⚙️ {$t('settings.title')}
      </h2>
      <button
        on:click={() => dispatch('close')}
        class="w-8 h-8 rounded-full bg-black/5 dark:bg-white/5 hover:bg-red-100 dark:hover:bg-red-900/30 flex items-center justify-center transition-all hover:scale-110 active:scale-95"
      >
        ✕
      </button>
    </div>

    <!-- Tabs -->
    <div class="px-7 pt-4 flex gap-2 flex-shrink-0">
      <button
        on:click={() => { activeTab = 'categories'; cancelEdit(); }}
        class="px-4 py-2 rounded-full text-sm font-medium transition-all {activeTab === 'categories'
          ? 'bg-graphite text-white'
          : 'bg-black/5 dark:bg-white/5 text-graphite dark:text-dark-text hover:bg-black/10 dark:hover:bg-white/10'}"
      >
        {$t('settings.categories')}
      </button>
      <button
        on:click={() => { activeTab = 'priorities'; cancelEdit(); }}
        class="px-4 py-2 rounded-full text-sm font-medium transition-all {activeTab === 'priorities'
          ? 'bg-graphite text-white'
          : 'bg-black/5 dark:bg-white/5 text-graphite dark:text-dark-text hover:bg-black/10 dark:hover:bg-white/10'}"
      >
        {$t('settings.priorities')}
      </button>
      <button
        on:click={() => { activeTab = 'profile'; cancelEdit(); }}
        class="px-4 py-2 rounded-full text-sm font-medium transition-all {activeTab === 'profile'
          ? 'bg-graphite text-white'
          : 'bg-black/5 dark:bg-white/5 text-graphite dark:text-dark-text hover:bg-black/10 dark:hover:bg-white/10'}"
      >
        {$t('settings.profile')}
      </button>
    </div>

    <!-- Content -->
    <div class="p-7 overflow-y-auto flex-1">
      {#if activeTab === 'profile'}
        <!-- Profile tab -->
        <div class="space-y-6">
          <!-- Email -->
          <div>
            <label class="block text-xs font-medium text-black/60 dark:text-white/60 mb-1">{$t('settings.email')}</label>
            <div class="flex gap-2">
              <input
                type="email"
                bind:value={profileEmail}
                placeholder="user@example.com"
                class="flex-1 px-3 py-2 text-sm bg-white/80 dark:bg-dark-bg/80 border border-black/[0.08] dark:border-white/[0.08] rounded-none text-graphite dark:text-dark-text"
              />
              <button
                on:click={saveProfile}
                disabled={profileSaving}
                class="px-4 py-2 rounded-full text-sm font-medium bg-graphite text-white hover:bg-black transition-all disabled:opacity-50"
              >
                {profileSaving ? '...' : $t('actions.save')}
              </button>
            </div>
          </div>

          <hr class="border-black/[0.08] dark:border-white/[0.08]" />

          <!-- Change password -->
          <div class="space-y-3">
            <h3 class="text-sm font-medium text-graphite dark:text-dark-text">{$t('settings.changePassword')}</h3>
            <div>
              <label class="block text-xs font-medium text-black/60 dark:text-white/60 mb-1">{$t('settings.currentPassword')}</label>
              <input
                type="password"
                bind:value={currentPassword}
                placeholder="••••••••"
                class="w-full px-3 py-2 text-sm bg-white/80 dark:bg-dark-bg/80 border border-black/[0.08] dark:border-white/[0.08] rounded-none text-graphite dark:text-dark-text"
              />
            </div>
            <div>
              <label class="block text-xs font-medium text-black/60 dark:text-white/60 mb-1">{$t('settings.newPassword')}</label>
              <input
                type="password"
                bind:value={newPassword}
                placeholder="••••••••"
                class="w-full px-3 py-2 text-sm bg-white/80 dark:bg-dark-bg/80 border border-black/[0.08] dark:border-white/[0.08] rounded-none text-graphite dark:text-dark-text"
              />
            </div>
            <div>
              <label class="block text-xs font-medium text-black/60 dark:text-white/60 mb-1">{$t('settings.confirmPassword')}</label>
              <input
                type="password"
                bind:value={confirmPassword}
                placeholder="••••••••"
                class="w-full px-3 py-2 text-sm bg-white/80 dark:bg-dark-bg/80 border border-black/[0.08] dark:border-white/[0.08] rounded-none text-graphite dark:text-dark-text"
              />
            </div>
            <button
              on:click={savePassword}
              disabled={passwordSaving || !currentPassword || !newPassword || !confirmPassword}
              class="px-4 py-2 rounded-full text-sm font-medium bg-graphite text-white hover:bg-black transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {passwordSaving ? $t('app.loading') : $t('settings.changePassword')}
            </button>
          </div>
        </div>
      {:else if loading}
        <div class="flex justify-center py-8">
          <div class="animate-spin rounded-full h-8 w-8 border-2 border-indigo-500 border-t-transparent"></div>
        </div>
      {:else if editingItem}
        <!-- Edit/Create Form -->
        <div class="space-y-4">
          <div class="grid grid-cols-3 gap-3">
            <div>
              <label class="block text-xs font-medium text-black/60 dark:text-white/60 mb-1">Code *</label>
              <input
                type="text"
                bind:value={editForm.code}
                disabled={editingItem.code !== null}
                placeholder="electronics"
                class="w-full px-3 py-2 text-sm bg-white/80 dark:bg-dark-bg/80 border border-black/[0.08] dark:border-white/[0.08] rounded-none text-graphite dark:text-dark-text disabled:opacity-50"
              />
            </div>
            <div>
              <label class="block text-xs font-medium text-black/60 dark:text-white/60 mb-1">Emoji</label>
              <input
                type="text"
                bind:value={editForm.emoji}
                placeholder="📦"
                class="w-full px-3 py-2 text-sm bg-white/80 dark:bg-dark-bg/80 border border-black/[0.08] dark:border-white/[0.08] rounded-none text-graphite dark:text-dark-text"
              />
            </div>
            <div>
              <label class="block text-xs font-medium text-black/60 dark:text-white/60 mb-1">{$t('settings.sortOrder')}</label>
              <input
                type="number"
                bind:value={editForm.sort_order}
                class="w-full px-3 py-2 text-sm bg-white/80 dark:bg-dark-bg/80 border border-black/[0.08] dark:border-white/[0.08] rounded-none text-graphite dark:text-dark-text"
              />
            </div>
          </div>

          <!-- Translation fields -->
          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-xs font-medium text-black/60 dark:text-white/60">{$t('settings.translations')}</span>
              <button
                on:click={aiTranslate}
                disabled={translating}
                class="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-all disabled:opacity-50"
              >
                {translating ? '⏳' : '✨'} AI
              </button>
            </div>

            <div class="flex items-center gap-2">
              <span class="text-lg w-8 text-center">🇷🇺</span>
              <input
                type="text"
                bind:value={editForm.name_ru}
                placeholder="Название (RU) *"
                class="flex-1 px-3 py-2 text-sm bg-white/80 dark:bg-dark-bg/80 border border-black/[0.08] dark:border-white/[0.08] rounded-none text-graphite dark:text-dark-text"
              />
            </div>
            <div class="flex items-center gap-2">
              <span class="text-lg w-8 text-center">🇬🇧</span>
              <input
                type="text"
                bind:value={editForm.name_en}
                placeholder="Name (EN)"
                class="flex-1 px-3 py-2 text-sm bg-white/80 dark:bg-dark-bg/80 border border-black/[0.08] dark:border-white/[0.08] rounded-none text-graphite dark:text-dark-text"
              />
            </div>
            <div class="flex items-center gap-2">
              <span class="text-lg w-8 text-center">🇷🇸</span>
              <input
                type="text"
                bind:value={editForm.name_sr}
                placeholder="Naziv (SR)"
                class="flex-1 px-3 py-2 text-sm bg-white/80 dark:bg-dark-bg/80 border border-black/[0.08] dark:border-white/[0.08] rounded-none text-graphite dark:text-dark-text"
              />
            </div>
          </div>

          <div class="flex gap-2 justify-end pt-2">
            <button
              on:click={cancelEdit}
              class="px-4 py-2 rounded-full text-sm font-medium bg-black/5 dark:bg-white/5 text-graphite dark:text-dark-text hover:bg-black/10 dark:hover:bg-white/10 transition-all"
            >
              {$t('actions.cancel')}
            </button>
            <button
              on:click={saveItem}
              disabled={saving}
              class="px-4 py-2 rounded-full text-sm font-medium bg-graphite text-white hover:bg-black transition-all disabled:opacity-50"
            >
              {saving ? $t('app.loading') : $t('actions.save')}
            </button>
          </div>
        </div>
      {:else}
        <!-- List -->
        <div class="space-y-2">
          {#each currentList as item, idx (item.code)}
            <div class="flex items-center gap-3 px-4 py-3 bg-white/50 dark:bg-white/5 border border-black/[0.06] dark:border-white/[0.06] rounded-lg group">
              <!-- Reorder buttons -->
              <div class="flex flex-col gap-0.5">
                <button
                  on:click={() => moveItem(currentType, item.code, 'up')}
                  disabled={idx === 0}
                  class="w-6 h-5 flex items-center justify-center text-xs text-black/30 dark:text-white/30 hover:text-black dark:hover:text-white disabled:opacity-20 disabled:cursor-default transition-colors"
                >▲</button>
                <button
                  on:click={() => moveItem(currentType, item.code, 'down')}
                  disabled={idx === currentList.length - 1}
                  class="w-6 h-5 flex items-center justify-center text-xs text-black/30 dark:text-white/30 hover:text-black dark:hover:text-white disabled:opacity-20 disabled:cursor-default transition-colors"
                >▼</button>
              </div>
              <span class="text-xl w-8 text-center">{item.emoji}</span>
              <div class="flex-1 min-w-0">
                <div class="text-sm font-medium text-graphite dark:text-dark-text truncate">{item.name}</div>
                <div class="text-xs text-black/40 dark:text-white/40">{item.code}</div>
              </div>
              <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  on:click={() => startEdit(currentType, item)}
                  class="w-8 h-8 rounded-full hover:bg-black/10 dark:hover:bg-white/10 flex items-center justify-center text-sm transition-all"
                  title={$t('actions.edit')}
                >
                  ✏️
                </button>
                <button
                  on:click={() => deleteItem(currentType, item.code)}
                  class="w-8 h-8 rounded-full hover:bg-red-100 dark:hover:bg-red-900/20 flex items-center justify-center text-sm transition-all"
                  title={$t('actions.delete')}
                >
                  🗑️
                </button>
              </div>
            </div>
          {/each}

          {#if currentList.length === 0}
            <p class="text-sm text-black/40 dark:text-white/40 text-center py-8">
              {$t('settings.empty')}
            </p>
          {/if}
        </div>

        <!-- Add button -->
        <button
          on:click={() => startEdit(currentType)}
          class="mt-4 w-full py-2.5 rounded-full text-sm font-medium border-2 border-dashed border-black/10 dark:border-white/10 text-black/50 dark:text-white/50 hover:border-indigo-400 hover:text-indigo-600 dark:hover:border-indigo-500 dark:hover:text-indigo-400 transition-all"
        >
          + {$t('settings.add')}
        </button>
      {/if}
    </div>
  </div>
</div>
