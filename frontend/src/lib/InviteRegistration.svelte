<script>
  import { createEventDispatcher, onMount } from 'svelte';
  import { fetchInvite, acceptInvite } from './utils/api.js';
  import { auth } from './stores/auth.js';
  import { t } from './utils/i18n.js';
  import { toasts } from './stores/toasts.js';

  export let token;

  const dispatch = createEventDispatcher();

  let invite = null;
  let loading = true;
  let saving = false;
  let error = '';
  let slug = '';
  let name = '';
  let password = '';
  let confirmPassword = '';

  onMount(loadInvite);

  $: if (invite?.name_hint && !name) {
    name = invite.name_hint;
  }

  async function loadInvite() {
    loading = true;
    error = '';
    try {
      invite = await fetchInvite(token);
    } catch (e) {
      error = e.message || $t('invite.invalid');
    } finally {
      loading = false;
    }
  }

  function normalizeSlug(value) {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/-{2,}/g, '-');
  }

  async function submit() {
    error = '';
    const cleanSlug = normalizeSlug(slug);
    slug = cleanSlug;

    if (!cleanSlug || !name.trim() || !password) {
      error = $t('invite.required');
      return;
    }
    if (password.length < 8) {
      error = $t('invite.passwordLength');
      return;
    }
    if (password !== confirmPassword) {
      error = $t('settings.passwordMismatch');
      return;
    }

    saving = true;
    try {
      const result = await acceptInvite(token, {
        slug: cleanSlug,
        name: name.trim(),
        password,
      });
      auth.setSession(result.token, result.user);
      toasts.success($t('invite.accepted'));
      dispatch('registered', result.user);
    } catch (e) {
      error = e.message || $t('invite.acceptFailed');
    } finally {
      saving = false;
    }
  }
</script>

<div class="min-h-[70vh] flex items-center justify-center px-4">
  <div
    class="w-full max-w-md bg-white/80 dark:bg-dark-bg/80 border border-black/[0.08] dark:border-white/[0.08] shadow-editorial p-7"
  >
    <div class="mb-6">
      <h2 class="text-2xl font-medium tracking-tighter text-graphite dark:text-dark-text">
        {$t('invite.title')}
      </h2>
      <p class="mt-2 text-sm text-black/60 dark:text-white/60">
        {$t('invite.subtitle')}
      </p>
    </div>

    {#if loading}
      <div class="flex justify-center py-8">
        <div
          class="animate-spin rounded-full h-8 w-8 border-2 border-indigo-500 border-t-transparent"
        ></div>
      </div>
    {:else if error && !invite}
      <div class="bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-500">
        {error}
      </div>
    {:else}
      <div class="space-y-4">
        {#if invite.email}
          <div>
            <span class="block text-xs font-medium text-black/60 dark:text-white/60 mb-1"
              >{$t('settings.email')}</span
            >
            <div
              class="px-3 py-2 text-sm bg-black/5 dark:bg-white/5 text-graphite dark:text-dark-text"
            >
              {invite.email}
            </div>
          </div>
        {/if}

        <div>
          <label
            for="invite-name"
            class="block text-xs font-medium text-black/60 dark:text-white/60 mb-1"
            >{$t('invite.name')}</label
          >
          <input
            id="invite-name"
            type="text"
            bind:value={name}
            disabled={saving}
            class="w-full px-3 py-2 bg-white dark:bg-dark-bg border border-black/[0.08] dark:border-white/[0.08] text-graphite dark:text-dark-text"
          />
        </div>

        <div>
          <label
            for="invite-slug"
            class="block text-xs font-medium text-black/60 dark:text-white/60 mb-1"
            >{$t('invite.slug')}</label
          >
          <input
            id="invite-slug"
            type="text"
            bind:value={slug}
            disabled={saving}
            placeholder="alexey"
            class="w-full px-3 py-2 bg-white dark:bg-dark-bg border border-black/[0.08] dark:border-white/[0.08] text-graphite dark:text-dark-text"
          />
        </div>

        <div>
          <label
            for="invite-password"
            class="block text-xs font-medium text-black/60 dark:text-white/60 mb-1"
            >{$t('auth.password')}</label
          >
          <input
            id="invite-password"
            type="password"
            bind:value={password}
            disabled={saving}
            class="w-full px-3 py-2 bg-white dark:bg-dark-bg border border-black/[0.08] dark:border-white/[0.08] text-graphite dark:text-dark-text"
          />
        </div>

        <div>
          <label
            for="invite-confirm-password"
            class="block text-xs font-medium text-black/60 dark:text-white/60 mb-1"
            >{$t('settings.confirmPassword')}</label
          >
          <input
            id="invite-confirm-password"
            type="password"
            bind:value={confirmPassword}
            disabled={saving}
            on:keydown={(e) => e.key === 'Enter' && submit()}
            class="w-full px-3 py-2 bg-white dark:bg-dark-bg border border-black/[0.08] dark:border-white/[0.08] text-graphite dark:text-dark-text"
          />
        </div>

        {#if invite.can_use_ai}
          <p class="text-xs text-indigo-600 dark:text-indigo-300">{$t('invite.aiIncluded')}</p>
        {/if}

        {#if error}
          <div class="bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-500">
            {error}
          </div>
        {/if}

        <button
          on:click={submit}
          disabled={saving}
          class="w-full h-10 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-all disabled:opacity-50"
        >
          {saving ? $t('app.loading') : $t('invite.accept')}
        </button>
      </div>
    {/if}
  </div>
</div>
