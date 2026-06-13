<script>
  import { createEventDispatcher, onMount } from 'svelte';
  import { fly, scale } from 'svelte/transition';
  import { quintOut } from 'svelte/easing';
  import { locale } from './stores/locale.js';
  import { toasts } from './stores/toasts.js';
  import { t } from './utils/i18n.js';
  import { designSystem } from './utils/design-system.js';
  import {
    fetchCategories,
    fetchPriorities,
    createCategory,
    updateCategory,
    deleteCategory,
    createPriority,
    updatePriority,
    deletePriority,
    translateText,
    updateProfile,
    changePassword,
    fetchAdminInvites,
    createAdminInvite,
    revokeAdminInvite,
    fetchAdminUsers,
    updateAdminUserAccess,
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
  let adminInvites = [];
  let adminUsers = [];
  let adminLoading = false;
  let adminLoaded = false;
  let inviteEmail = '';
  let inviteNameHint = '';
  let inviteCanUseAi = false;
  let lastInviteUrl = '';
  let tabTitle = '';
  let tabDescription = '';

  let authUser = null;
  auth.user.subscribe((val) => {
    authUser = val;
  });

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
        fetchPriorities($locale),
      ]);
    } catch (e) {
      toasts.error(e.message);
    } finally {
      loading = false;
    }
  }

  async function loadAdminData() {
    if (!authUser?.is_admin) return;
    adminLoading = true;
    try {
      [adminInvites, adminUsers] = await Promise.all([fetchAdminInvites(), fetchAdminUsers()]);
    } catch (e) {
      toasts.error(e.message);
    } finally {
      adminLoaded = true;
      adminLoading = false;
    }
  }

  function openAdminTab() {
    activeTab = 'admin';
    cancelEdit();
    if (!adminLoaded && !adminLoading) {
      loadAdminData();
    }
  }

  function switchTab(tab) {
    if (tab === 'admin') {
      openAdminTab();
      return;
    }

    activeTab = tab;
    cancelEdit();
  }

  $: {
    if (activeTab === 'categories') {
      tabTitle = $t('settings.categories');
      tabDescription = $t('settings.categoriesDescription');
    } else if (activeTab === 'priorities') {
      tabTitle = $t('settings.priorities');
      tabDescription = $t('settings.prioritiesDescription');
    } else if (activeTab === 'profile') {
      tabTitle = $t('settings.profile');
      tabDescription = $t('settings.profileDescription');
    } else if (activeTab === 'admin') {
      tabTitle = $t('admin.title');
      tabDescription = $t('settings.adminDescription');
    } else {
      tabTitle = $t('settings.title');
      tabDescription = '';
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
        name_sr: item.name_sr || '',
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
    if (!authUser?.can_use_ai) return;

    // Find source: first non-empty name field
    let sourceLocale = null;
    let sourceText = null;

    if (editForm.name_ru) {
      sourceLocale = 'ru';
      sourceText = editForm.name_ru;
    } else if (editForm.name_en) {
      sourceLocale = 'en';
      sourceText = editForm.name_en;
    } else if (editForm.name_sr) {
      sourceLocale = 'sr';
      sourceText = editForm.name_sr;
    }

    if (!sourceText) {
      toasts.error('Fill in at least one name to translate');
      return;
    }

    const targets = ['ru', 'en', 'sr'].filter((l) => l !== sourceLocale);

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
      await updateProfile({ email: profileEmail.trim() || null });
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
    const idx = list.findIndex((i) => i.code === code);
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
        updateFn(swap.code, { ...swap, sort_order: item.sort_order }),
      ]);
      await loadData();
      dispatch('updated');
    } catch (e) {
      toasts.error(e.message);
    }
  }

  $: currentList = activeTab === 'categories' ? categories : priorities;
  $: currentType = activeTab === 'categories' ? 'category' : 'priority';

  async function createInvite() {
    try {
      const invite = await createAdminInvite({
        email: inviteEmail.trim() || null,
        name_hint: inviteNameHint.trim() || null,
        can_use_ai: inviteCanUseAi,
      });
      lastInviteUrl = invite.invite_url;
      inviteEmail = '';
      inviteNameHint = '';
      inviteCanUseAi = false;
      await loadAdminData();
      toasts.success($t('admin.inviteCreated'));
    } catch (e) {
      toasts.error(e.message);
    }
  }

  async function revokeInvite(id) {
    try {
      await revokeAdminInvite(id);
      await loadAdminData();
      toasts.success($t('admin.inviteRevoked'));
    } catch (e) {
      toasts.error(e.message);
    }
  }

  async function updateUserAccess(user, field, value) {
    try {
      const updated = await updateAdminUserAccess(user.id, { [field]: value });
      adminUsers = adminUsers.map((u) => (u.id === updated.id ? updated : u));
      if (authUser?.id === updated.id) await auth.refresh();
      toasts.success($t('admin.accessUpdated'));
    } catch (e) {
      toasts.error(e.message);
      await loadAdminData();
    }
  }

  async function copyInviteUrl() {
    if (!lastInviteUrl) return;
    try {
      await navigator.clipboard.writeText(lastInviteUrl);
      toasts.success($t('admin.linkCopied'));
    } catch {
      toasts.error(lastInviteUrl);
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

<div
  class="modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
  transition:scale={{ duration: 200, start: 0.95, easing: quintOut }}
  on:click={handleClickOutside}
  on:keydown={handleKeydown}
  role="button"
  tabindex="-1"
  aria-label="Close modal"
>
  <div
    class="bg-ivory dark:bg-dark-bg backdrop-blur-xl rounded-modal shadow-raised border border-black/[0.08] dark:border-white/[0.08] flex h-[88vh] w-full max-w-5xl flex-col overflow-hidden"
    transition:fly={{ y: 50, opacity: 0, duration: 300 }}
    role="dialog"
    aria-modal="true"
    tabindex="-1"
  >
    <!-- Header -->
    <div
      class="px-5 sm:px-6 py-4 border-b border-black/[0.08] dark:border-white/[0.08] flex items-center justify-between flex-shrink-0"
    >
      <div>
        <p class="text-xs font-medium uppercase text-black/40 dark:text-white/40">
          {$t('settings.title')}
        </p>
        <h2
          class="{designSystem.text['2xl']} {designSystem.text.weight.medium} {designSystem.text
            .tracking.tighter} text-graphite dark:text-dark-text"
        >
          {tabTitle}
        </h2>
      </div>
      <button
        on:click={() => dispatch('close')}
        class="w-8 h-8 rounded-full bg-black/5 dark:bg-white/5 hover:bg-red-100 dark:hover:bg-red-900/30 flex items-center justify-center transition-all hover:scale-110 active:scale-95"
        aria-label="Close settings"
      >
        ✕
      </button>
    </div>

    <div class="flex min-h-0 flex-1 flex-col md:grid md:grid-cols-[220px_1fr]">
      <!-- Tabs -->
      <nav
        class="grid auto-rows-min grid-cols-2 content-start gap-2 border-b border-black/[0.08] p-3 dark:border-white/[0.08] md:flex md:flex-col md:border-b-0 md:border-r"
        aria-label="Settings sections"
      >
        <button
          on:click={() => switchTab('categories')}
          class="flex h-10 items-center justify-between gap-2 rounded-lg px-3 text-left text-sm font-medium transition-all md:h-auto md:py-2 {activeTab ===
          'categories'
            ? 'bg-graphite text-white shadow-editorial'
            : 'text-graphite dark:text-dark-text hover:bg-black/5 dark:hover:bg-white/5'}"
        >
          <span>🏷️ {$t('settings.categories')}</span>
          <span class="text-xs opacity-60">{categories.length}</span>
        </button>
        <button
          on:click={() => switchTab('priorities')}
          class="flex h-10 items-center justify-between gap-2 rounded-lg px-3 text-left text-sm font-medium transition-all md:h-auto md:py-2 {activeTab ===
          'priorities'
            ? 'bg-graphite text-white shadow-editorial'
            : 'text-graphite dark:text-dark-text hover:bg-black/5 dark:hover:bg-white/5'}"
        >
          <span>⭐ {$t('settings.priorities')}</span>
          <span class="text-xs opacity-60">{priorities.length}</span>
        </button>
        <button
          on:click={() => switchTab('profile')}
          class="flex h-10 items-center gap-2 rounded-lg px-3 text-left text-sm font-medium transition-all md:h-auto md:py-2 {activeTab ===
          'profile'
            ? 'bg-graphite text-white shadow-editorial'
            : 'text-graphite dark:text-dark-text hover:bg-black/5 dark:hover:bg-white/5'}"
        >
          👤 {$t('settings.profile')}
        </button>
        {#if authUser?.is_admin}
          <button
            on:click={() => switchTab('admin')}
            class="flex h-10 items-center gap-2 rounded-lg px-3 text-left text-sm font-medium transition-all md:h-auto md:py-2 {activeTab ===
            'admin'
              ? 'bg-graphite text-white shadow-editorial'
              : 'text-graphite dark:text-dark-text hover:bg-black/5 dark:hover:bg-white/5'}"
          >
            🛠️ {$t('admin.title')}
          </button>
        {/if}
      </nav>

      <!-- Content -->
      <div class="min-h-0 overflow-y-auto p-5 sm:p-6">
        <div class="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 class="text-lg font-medium text-graphite dark:text-dark-text">{tabTitle}</h3>
            <p class="mt-1 text-sm text-black/50 dark:text-white/50">{tabDescription}</p>
          </div>
          {#if !editingItem && (activeTab === 'categories' || activeTab === 'priorities')}
            <button
              on:click={() => startEdit(currentType)}
              class="h-10 rounded-full bg-indigo-600 px-4 text-sm font-medium text-white shadow-editorial transition-all hover:bg-indigo-500"
            >
              + {$t('settings.add')}
            </button>
          {/if}
        </div>
        {#if activeTab === 'admin' && authUser?.is_admin}
          <div class="space-y-6">
            <div class="space-y-3">
              <h3 class="text-sm font-medium text-graphite dark:text-dark-text">
                {$t('admin.createInvite')}
              </h3>
              <div class="grid grid-cols-2 gap-3">
                <input
                  type="email"
                  bind:value={inviteEmail}
                  placeholder={$t('settings.email')}
                  class="px-3 py-2 text-sm bg-white/80 dark:bg-dark-bg/80 border border-black/[0.08] dark:border-white/[0.08] rounded-none text-graphite dark:text-dark-text"
                />
                <input
                  type="text"
                  bind:value={inviteNameHint}
                  placeholder={$t('admin.nameHint')}
                  class="px-3 py-2 text-sm bg-white/80 dark:bg-dark-bg/80 border border-black/[0.08] dark:border-white/[0.08] rounded-none text-graphite dark:text-dark-text"
                />
              </div>
              <label class="flex items-center gap-2 text-sm text-graphite dark:text-dark-text">
                <input type="checkbox" bind:checked={inviteCanUseAi} />
                {$t('admin.aiAccess')}
              </label>
              <button
                on:click={createInvite}
                class="px-4 py-2 rounded-full text-sm font-medium bg-graphite text-white hover:bg-black transition-all"
              >
                {$t('admin.createInvite')}
              </button>
              {#if lastInviteUrl}
                <div class="flex gap-2">
                  <input
                    type="text"
                    readonly
                    value={lastInviteUrl}
                    class="flex-1 px-3 py-2 text-xs bg-black/5 dark:bg-white/5 border border-black/[0.08] dark:border-white/[0.08] text-graphite dark:text-dark-text"
                  />
                  <button
                    on:click={copyInviteUrl}
                    class="px-4 py-2 rounded-full text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-500 transition-all"
                  >
                    {$t('admin.copyLink')}
                  </button>
                </div>
              {/if}
            </div>

            <hr class="border-black/[0.08] dark:border-white/[0.08]" />

            {#if adminLoading}
              <div class="flex justify-center py-8">
                <div
                  class="animate-spin rounded-full h-8 w-8 border-2 border-indigo-500 border-t-transparent"
                ></div>
              </div>
            {:else}
              <div class="space-y-3">
                <h3 class="text-sm font-medium text-graphite dark:text-dark-text">
                  {$t('admin.users')}
                </h3>
                {#each adminUsers as user (user.id)}
                  <div
                    class="flex items-center gap-3 px-4 py-3 bg-white/50 dark:bg-white/5 border border-black/[0.06] dark:border-white/[0.06] rounded-lg"
                  >
                    <div class="flex-1 min-w-0">
                      <div class="text-sm font-medium text-graphite dark:text-dark-text">
                        {user.avatar_emoji || '🎁'}
                        {user.name}
                      </div>
                      <div class="text-xs text-black/40 dark:text-white/40">
                        /{user.slug}{user.email ? ` · ${user.email}` : ''}
                      </div>
                    </div>
                    <label class="flex items-center gap-1 text-xs text-black/60 dark:text-white/60">
                      <input
                        type="checkbox"
                        checked={user.can_use_ai}
                        on:change={(e) =>
                          updateUserAccess(user, 'can_use_ai', e.currentTarget.checked)}
                      />
                      {$t('admin.aiAccess')}
                    </label>
                    <label class="flex items-center gap-1 text-xs text-black/60 dark:text-white/60">
                      <input
                        type="checkbox"
                        checked={user.is_admin}
                        on:change={(e) =>
                          updateUserAccess(user, 'is_admin', e.currentTarget.checked)}
                      />
                      {$t('admin.adminAccess')}
                    </label>
                  </div>
                {/each}
              </div>

              <div class="space-y-3">
                <h3 class="text-sm font-medium text-graphite dark:text-dark-text">
                  {$t('admin.invites')}
                </h3>
                {#each adminInvites as invite (invite.id)}
                  <div
                    class="flex items-center gap-3 px-4 py-3 bg-white/50 dark:bg-white/5 border border-black/[0.06] dark:border-white/[0.06] rounded-lg"
                  >
                    <div class="flex-1 min-w-0">
                      <div class="text-sm font-medium text-graphite dark:text-dark-text">
                        {invite.name_hint || invite.email || $t('admin.invite')}
                      </div>
                      <div class="text-xs text-black/40 dark:text-white/40">
                        {invite.status} · {$t('admin.expires')}
                        {new Date(invite.expires_at).toLocaleDateString()}
                      </div>
                    </div>
                    {#if invite.can_use_ai}
                      <span class="text-xs text-indigo-600 dark:text-indigo-300">AI</span>
                    {/if}
                    {#if invite.status === 'active'}
                      <button
                        on:click={() => revokeInvite(invite.id)}
                        class="px-3 py-1 rounded-full text-xs bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-all"
                      >
                        {$t('admin.revoke')}
                      </button>
                    {/if}
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        {:else if activeTab === 'profile'}
          <!-- Profile tab -->
          <div class="space-y-6">
            <!-- Email -->
            <div>
              <label
                for="profile-email"
                class="block text-xs font-medium text-black/60 dark:text-white/60 mb-1"
                >{$t('settings.email')}</label
              >
              <div class="flex gap-2">
                <input
                  type="email"
                  id="profile-email"
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
              <h3 class="text-sm font-medium text-graphite dark:text-dark-text">
                {$t('settings.changePassword')}
              </h3>
              <div>
                <label
                  for="current-password"
                  class="block text-xs font-medium text-black/60 dark:text-white/60 mb-1"
                  >{$t('settings.currentPassword')}</label
                >
                <input
                  id="current-password"
                  type="password"
                  bind:value={currentPassword}
                  placeholder="••••••••"
                  class="w-full px-3 py-2 text-sm bg-white/80 dark:bg-dark-bg/80 border border-black/[0.08] dark:border-white/[0.08] rounded-none text-graphite dark:text-dark-text"
                />
              </div>
              <div>
                <label
                  for="new-password"
                  class="block text-xs font-medium text-black/60 dark:text-white/60 mb-1"
                  >{$t('settings.newPassword')}</label
                >
                <input
                  id="new-password"
                  type="password"
                  bind:value={newPassword}
                  placeholder="••••••••"
                  class="w-full px-3 py-2 text-sm bg-white/80 dark:bg-dark-bg/80 border border-black/[0.08] dark:border-white/[0.08] rounded-none text-graphite dark:text-dark-text"
                />
              </div>
              <div>
                <label
                  for="confirm-password"
                  class="block text-xs font-medium text-black/60 dark:text-white/60 mb-1"
                  >{$t('settings.confirmPassword')}</label
                >
                <input
                  id="confirm-password"
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
            <div
              class="animate-spin rounded-full h-8 w-8 border-2 border-indigo-500 border-t-transparent"
            ></div>
          </div>
        {:else if editingItem}
          <!-- Edit/Create Form -->
          <div class="space-y-4">
            <div class="grid grid-cols-3 gap-3">
              <div>
                <label
                  for="settings-item-code"
                  class="block text-xs font-medium text-black/60 dark:text-white/60 mb-1"
                  >Code *</label
                >
                <input
                  id="settings-item-code"
                  type="text"
                  bind:value={editForm.code}
                  disabled={editingItem.code !== null}
                  placeholder="electronics"
                  class="w-full px-3 py-2 text-sm bg-white/80 dark:bg-dark-bg/80 border border-black/[0.08] dark:border-white/[0.08] rounded-none text-graphite dark:text-dark-text disabled:opacity-50"
                />
              </div>
              <div>
                <label
                  for="settings-item-emoji"
                  class="block text-xs font-medium text-black/60 dark:text-white/60 mb-1"
                  >Emoji</label
                >
                <input
                  id="settings-item-emoji"
                  type="text"
                  bind:value={editForm.emoji}
                  placeholder="📦"
                  class="w-full px-3 py-2 text-sm bg-white/80 dark:bg-dark-bg/80 border border-black/[0.08] dark:border-white/[0.08] rounded-none text-graphite dark:text-dark-text"
                />
              </div>
              <div>
                <label
                  for="settings-item-sort-order"
                  class="block text-xs font-medium text-black/60 dark:text-white/60 mb-1"
                  >{$t('settings.sortOrder')}</label
                >
                <input
                  id="settings-item-sort-order"
                  type="number"
                  bind:value={editForm.sort_order}
                  class="w-full px-3 py-2 text-sm bg-white/80 dark:bg-dark-bg/80 border border-black/[0.08] dark:border-white/[0.08] rounded-none text-graphite dark:text-dark-text"
                />
              </div>
            </div>

            <!-- Translation fields -->
            <div class="space-y-3">
              <div class="flex items-center justify-between">
                <span class="text-xs font-medium text-black/60 dark:text-white/60"
                  >{$t('settings.translations')}</span
                >
                {#if authUser?.can_use_ai}
                  <button
                    on:click={aiTranslate}
                    disabled={translating}
                    class="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-all disabled:opacity-50"
                  >
                    {translating ? '⏳' : '✨'} AI
                  </button>
                {/if}
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
          <div
            class="overflow-hidden rounded-xl border border-black/[0.08] bg-white/55 dark:border-white/[0.08] dark:bg-white/[0.04]"
          >
            {#each currentList as item, idx (item.code)}
              <div
                class="flex items-center gap-4 border-b border-black/[0.06] px-4 py-3 last:border-b-0 dark:border-white/[0.06]"
              >
                <span
                  class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-black/[0.04] text-xl dark:bg-white/[0.06]"
                  >{item.emoji}</span
                >
                <div class="min-w-0 flex-1">
                  <div class="truncate text-sm font-medium text-graphite dark:text-dark-text">
                    {item.name}
                  </div>
                  <div
                    class="mt-0.5 flex items-center gap-2 text-xs text-black/40 dark:text-white/40"
                  >
                    <span>{item.code}</span>
                    <span aria-hidden="true">·</span>
                    <span>{$t('settings.sortOrder')} {item.sort_order}</span>
                  </div>
                </div>

                <div class="flex items-center gap-1">
                  <button
                    on:click={() => moveItem(currentType, item.code, 'up')}
                    disabled={idx === 0}
                    class="flex h-8 w-8 items-center justify-center rounded-full text-xs text-black/35 transition-colors hover:bg-black/5 hover:text-black disabled:cursor-default disabled:opacity-20 dark:text-white/35 dark:hover:bg-white/10 dark:hover:text-white"
                    >▲</button
                  >
                  <button
                    on:click={() => moveItem(currentType, item.code, 'down')}
                    disabled={idx === currentList.length - 1}
                    class="flex h-8 w-8 items-center justify-center rounded-full text-xs text-black/35 transition-colors hover:bg-black/5 hover:text-black disabled:cursor-default disabled:opacity-20 dark:text-white/35 dark:hover:bg-white/10 dark:hover:text-white"
                    >▼</button
                  >
                  <button
                    on:click={() => startEdit(currentType, item)}
                    class="flex h-8 w-8 items-center justify-center rounded-full text-sm transition-all hover:bg-black/10 dark:hover:bg-white/10"
                    title={$t('actions.edit')}
                  >
                    ✏️
                  </button>
                  <button
                    on:click={() => deleteItem(currentType, item.code)}
                    class="flex h-8 w-8 items-center justify-center rounded-full text-sm transition-all hover:bg-red-100 dark:hover:bg-red-900/20"
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
        {/if}
      </div>
    </div>
  </div>
</div>
