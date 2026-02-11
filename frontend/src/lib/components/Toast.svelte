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
          bg: 'bg-emerald-500/10',
          border: 'border-emerald-500/20',
          text: 'text-emerald-700 dark:text-emerald-300',
          icon: '✅',
        };
      case 'error':
        return {
          bg: 'bg-red-500/10',
          border: 'border-red-500/20',
          text: 'text-red-700 dark:text-red-300',
          icon: '❌',
        };
      case 'info':
      default:
        return {
          bg: 'bg-indigo-500/10',
          border: 'border-indigo-500/20',
          text: 'text-indigo-700 dark:text-indigo-300',
          icon: 'ℹ️',
        };
    }
  }

  const styles = getStyles();
</script>

<div
  class="flex items-center gap-3 px-4 py-3 rounded-none border shadow-editorial backdrop-blur-md {styles.bg} {styles.border} {styles.text}"
  transition:fly={{ y: -20, opacity: 0, duration: 300 }}
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
