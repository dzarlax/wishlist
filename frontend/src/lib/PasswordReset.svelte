<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { resetPassword } from './utils/api.js';
  import { t } from './utils/i18n.js';

  export let token: string;

  const dispatch = createEventDispatcher<{ close: void }>();
  const backButtonClass = 'font-medium text-indigo-700 underline decoration-indigo-700/60 underline-offset-2 hover:text-indigo-900 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50 dark:text-indigo-300 dark:decoration-indigo-300/60 dark:hover:text-indigo-200';
  let password = '';
  let confirmation = '';
  let saving = false;
  let completed = false;
  let errorKey = '';

  async function submit() {
    if (saving || completed) return;
    errorKey = '';
    if ([...password].length < 8 || new TextEncoder().encode(password).length > 72) {
      errorKey = 'passwordReset.passwordLength';
      return;
    }
    if (password !== confirmation) {
      errorKey = 'passwordReset.mismatch';
      return;
    }

    saving = true;
    try {
      await resetPassword(token, password);
      completed = true;
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code === 'RESET_LINK_INVALID') errorKey = 'passwordReset.invalidLink';
      else if (code === 'RESET_RATE_LIMITED') errorKey = 'passwordReset.rateLimited';
      else if (code === 'INVALID_PASSWORD_LENGTH') errorKey = 'passwordReset.passwordLength';
      else errorKey = 'app.error';
    } finally {
      password = '';
      confirmation = '';
      saving = false;
    }
  }
</script>

<section class="mx-auto w-full max-w-[var(--width-modal)] rounded-modal border border-black/10 bg-white/60 p-4 text-graphite sm:p-6 dark:border-white/10 dark:bg-white/5 dark:text-dark-text" aria-labelledby="password-reset-title">
  <h2 id="password-reset-title" class="mb-4 text-xl font-semibold">
    {$t('passwordReset.title')}
  </h2>
  {#if completed}
    <p role="status" class="mb-4">{$t('passwordReset.completed')}</p>
    <button type="button" class={backButtonClass} on:click={() => dispatch('close')}>
      {$t('passwordReset.back')}
    </button>
  {:else if !/^[A-Za-z0-9_-]{43}$/.test(token)}
    <p role="alert" class="mb-4">{$t('passwordReset.invalidLink')}</p>
    <button type="button" class={backButtonClass} on:click={() => dispatch('close')}>
      {$t('passwordReset.back')}
    </button>
  {:else}
    <form class="space-y-4" on:submit|preventDefault={submit}>
      <div>
        <label for="reset-password" class="mb-1 block text-sm font-medium">{$t('settings.newPassword')}</label>
        <input id="reset-password" type="password" autocomplete="new-password" required
          bind:value={password} disabled={saving}
          class="w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-graphite dark:border-white/30 dark:bg-dark-bg dark:text-dark-text" />
      </div>
      <div>
        <label for="reset-confirmation" class="mb-1 block text-sm font-medium">{$t('settings.confirmPassword')}</label>
        <input id="reset-confirmation" type="password" autocomplete="new-password" required
          bind:value={confirmation} disabled={saving}
          class="w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-graphite dark:border-white/30 dark:bg-dark-bg dark:text-dark-text" />
      </div>
      {#if errorKey}
        <p role="alert" class="text-sm text-red-700 dark:text-red-300">{$t(errorKey)}</p>
      {/if}
      <div class="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={saving}
          class="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white disabled:opacity-50">
          {saving ? $t('app.loading') : $t('passwordReset.save')}
        </button>
        <button type="button" disabled={saving} class={backButtonClass} on:click={() => dispatch('close')}>
          {$t('passwordReset.back')}
        </button>
      </div>
    </form>
  {/if}
</section>
