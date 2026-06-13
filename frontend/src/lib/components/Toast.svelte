<script>
  import { fly } from 'svelte/transition';
  import { createEventDispatcher } from 'svelte';

  export let toast;

  const dispatch = createEventDispatcher();

  // Auto-dismiss timer
  let timer;

  $: if (toast.duration > 0) {
    clearTimeout(timer);
    timer = setTimeout(() => {
      dispatch('remove');
    }, toast.duration);
  }

  function getStyles() {
    switch (toast.type) {
      case 'success':
        return {
          bg: 'bg-emerald-100 dark:bg-emerald-900/60',
          border: 'border-emerald-300 dark:border-emerald-600',
          text: 'text-emerald-900 dark:text-emerald-100',
          icon: '✅',
        };
      case 'error':
        return {
          bg: 'bg-red-100 dark:bg-red-900/60',
          border: 'border-red-300 dark:border-red-600',
          text: 'text-red-900 dark:text-red-100',
          icon: '❌',
        };
      case 'info':
      default:
        return {
          bg: 'bg-indigo-100 dark:bg-indigo-900/60',
          border: 'border-indigo-300 dark:border-indigo-600',
          text: 'text-indigo-900 dark:text-indigo-100',
          icon: 'ℹ️',
        };
    }
  }

  const styles = getStyles();
</script>

<div
  class="flex w-full min-w-0 items-start gap-3 px-4 py-3 rounded-lg border shadow-lg {styles.bg} {styles.border} {styles.text}"
  transition:fly={{ y: -30, opacity: 0, duration: 300 }}
  role="alert"
>
  <span class="text-lg leading-5 flex-shrink-0">{styles.icon}</span>
  <span class="min-w-0 flex-1 text-sm font-medium leading-snug tracking-tight break-words"
    >{toast.message}</span
  >
  <button
    on:click={() => dispatch('remove')}
    class="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full leading-none hover:bg-black/10 dark:hover:bg-white/10 hover:opacity-70 transition-opacity"
    aria-label="Close notification"
  >
    ✕
  </button>
</div>
