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
  class="flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg {styles.bg} {styles.border} {styles.text}"
  transition:fly={{ y: -30, opacity: 0, duration: 300 }}
  role="alert"
>
  <span class="text-lg flex-shrink-0">{styles.icon}</span>
  <span class="flex-1 text-sm font-medium tracking-tight">{toast.message}</span>
  <button
    on:click={() => dispatch('remove')}
    class="flex-shrink-0 ml-2 hover:opacity-70 transition-opacity"
  >
    ✕
  </button>
</div>
