<script>
  import { toasts } from '../stores/toasts.js';
  import Toast from './Toast.svelte';

  function removeToast(id) {
    toasts.remove(id);
  }
</script>

{#if $toasts.length > 0}
  <div class="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
    {#each $toasts as toast (toast.id)}
      <div class="pointer-events-auto" on:remove={() => removeToast(toast.id)}>
        <Toast {toast} on:remove={() => removeToast(toast.id)} />
      </div>
    {/each}
  </div>
{/if}
