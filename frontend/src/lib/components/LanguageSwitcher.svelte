<script>
  import { locale } from '../stores/locale.js';
  import { t } from '../utils/i18n.js';

  let isOpen = false;
  let button;

  const locales = [
    { code: 'ru', flag: '🇷🇺', name: 'Русский' },
    { code: 'en', flag: '🇬🇧', name: 'English' },
    { code: 'sr', flag: '🇷🇸', name: 'Српски' },
  ];

  function getCurrentLocale() {
    return locales.find((l) => l.code === $locale) || locales[0];
  }

  function selectLocale(code) {
    locale.set(code);
    isOpen = false;
  }

  function toggle() {
    isOpen = !isOpen;
  }

  // Close dropdown when clicking outside
  function handleClickOutside(event) {
    if (button && !button.contains(event.target)) {
      isOpen = false;
    }
  }

  // Handle escape key
  function handleKeydown(event) {
    if (event.key === 'Escape') {
      isOpen = false;
    }
  }
</script>

<svelte:window on:click={handleClickOutside} on:keydown={handleKeydown} />

<div class="relative" bind:this={button}>
  <button
    on:click={toggle}
    class="px-3 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 transition-all duration-200 flex items-center justify-center"
    aria-label={$t('language.switch')}
    aria-expanded={isOpen}
    type="button"
  >
    <span class="text-xl">{getCurrentLocale().flag}</span>
  </button>

  {#if isOpen}
    <div
      class="absolute right-0 mt-2 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 py-1 z-50 min-w-[80px]"
      role="menu"
    >
      {#each locales as loc (loc.code)}
        <button
          on:click={() => selectLocale(loc.code)}
          class="w-full flex items-center justify-center gap-3 px-4 py-3 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors {loc.code ===
          $locale
            ? 'bg-slate-100 dark:bg-slate-700'
            : ''}"
          role="menuitem"
          type="button"
        >
          <span class="text-2xl">{loc.flag}</span>
          {#if loc.code === $locale}
            <svg
              class="w-4 h-4 ml-auto text-slate-500 dark:text-slate-400"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fill-rule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clip-rule="evenodd"
              />
            </svg>
          {/if}
        </button>
      {/each}
    </div>
  {/if}
</div>
