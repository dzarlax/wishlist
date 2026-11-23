<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { createPasswordResetLink, updateAdminUserEmail } from './utils/api.js';
  import { toasts } from './stores/toasts.js';
  import { t } from './utils/i18n.js';

  export let user: { id: number; slug: string; email?: string | null };

  const dispatch = createEventDispatcher<{ updated: { id: number; email: string } }>();
  const actionClass = 'font-medium text-indigo-700 underline decoration-indigo-700/60 underline-offset-2 hover:text-indigo-900 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50 dark:text-indigo-300 dark:decoration-indigo-300/60 dark:hover:text-indigo-200';
  let action: 'email' | 'reset' | null = null;
  let email = '';
  let busy = false;
  let errorKey = '';
  let link = '';
  let linkInput: HTMLInputElement;

  function open(next: typeof action) {
    action = next;
    email = user.email || '';
    errorKey = '';
    link = '';
  }

  async function submit() {
    if (!action || busy || link) return;
    busy = true;
    errorKey = '';
    try {
      if (action === 'email') {
        const updated = await updateAdminUserEmail(user.id, email);
        open(null);
        dispatch('updated', updated);
      } else {
        const result = await createPasswordResetLink(user.id);
        link = result.reset_url;
      }
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code === 'EMAIL_IN_USE') errorKey = 'admin.emailInUse';
      else if (code === 'INVALID_EMAIL') errorKey = 'admin.invalidEmail';
      else errorKey = 'app.error';
    } finally {
      busy = false;
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link);
      toasts.success($t('admin.linkCopied'));
    } catch {
      linkInput?.focus();
      linkInput?.select();
    }
  }
</script>

<div class="flex w-full flex-wrap gap-x-4 gap-y-2 text-sm">
  <button type="button" class={actionClass} disabled={busy}
    aria-expanded={action === 'email'} on:click={() => open('email')}>
    {$t('admin.editEmail')}
  </button>
  <button type="button" class={actionClass} disabled={busy}
    aria-expanded={action === 'reset'} on:click={() => open('reset')}>
    {$t('admin.createResetLink')}
  </button>
</div>

{#if action}
  <form class="w-full space-y-3 border-t border-black/10 pt-3 text-sm text-graphite dark:border-white/10 dark:text-dark-text"
    on:submit|preventDefault={submit}>
    {#if action === 'email'}
      <label for={`admin-email-${user.id}`} class="block font-medium">{$t('settings.email')}</label>
      <input id={`admin-email-${user.id}`} type="email" required bind:value={email} disabled={busy}
        class="w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-graphite dark:border-white/30 dark:bg-dark-bg dark:text-dark-text" />
    {:else if link}
      <p role="status">{$t('admin.resetLinkReady')}</p>
      <label for={`admin-reset-link-${user.id}`} class="block font-medium">{$t('admin.resetLink')}</label>
      <input id={`admin-reset-link-${user.id}`} type="text" readonly value={link}
        autocomplete="off" spellcheck="false" bind:this={linkInput}
        class="w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-graphite dark:border-white/30 dark:bg-dark-bg dark:text-dark-text" />
    {:else}
      <p>{$t('admin.resetLinkConfirmation', { slug: user.slug })}</p>
    {/if}
    {#if errorKey}
      <p role="alert" class="text-red-700 dark:text-red-300">{$t(errorKey)}</p>
    {/if}
    <div class="flex flex-wrap items-center gap-3">
      {#if link}
        <button type="button" class="rounded-lg bg-indigo-600 px-3 py-2 text-white" on:click={copyLink}>
          {$t('admin.copyLink')}
        </button>
      {:else}
        <button type="submit" disabled={busy}
          class="rounded-lg bg-indigo-600 px-3 py-2 text-white disabled:opacity-50">
          {busy ? $t('app.loading') : action === 'email' ? $t('admin.saveEmail') : $t('admin.createResetLink')}
        </button>
      {/if}
      <button type="button" class={actionClass} disabled={busy} on:click={() => open(null)}>
        {$t('admin.closeCredentialForm')}
      </button>
    </div>
  </form>
{/if}
