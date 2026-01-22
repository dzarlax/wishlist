<script>
  import { createEventDispatcher } from 'svelte';
  import { fade, fly } from 'svelte/transition';

  export let gift;

  const dispatch = createEventDispatcher();

  let reservedBy = '';
  let secretCode = '';

  async function handleSubmit() {
    if (!secretCode.trim()) {
      alert('Введите секретный код');
      return;
    }

    try {
      const response = await fetch(`/api/gifts/${gift.id}/reserve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          secret_code: secretCode.trim(),
          reserved_by: reservedBy.trim() || 'Аноним'
        })
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Ошибка при бронировании');
        return;
      }

      dispatch('saved');
    } catch (error) {
      alert('Ошибка при бронировании подарка');
    }
  }

  function handleClickOutside(event) {
    if (event.target.classList.contains('modal-backdrop')) {
      dispatch('close');
    }
  }
</script>

<div
  class="modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
  transition:fade={{ duration: 200 }}
  on:click={handleClickOutside}
>
  <div
    class="bg-slate-800 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-700/50 w-full max-w-lg"
    transition:fly={{ y: 50, opacity: 0, duration: 300 }}
  >
    <!-- Header -->
    <div class="px-8 py-6 border-b border-slate-700/50">
      <h2 class="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-pink-400 bg-clip-text text-transparent">
        🔒 Забронировать подарок
      </h2>
    </div>

    <!-- Body -->
    <div class="p-8 space-y-6">
      <div>
        <label class="block text-sm font-semibold text-slate-300 mb-2">Ваше имя (опционально)</label>
        <input
          type="text"
          bind:value={reservedBy}
          placeholder="Аноним"
          class="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
        />
      </div>

      <div>
        <label class="block text-sm font-semibold text-slate-300 mb-2">🔑 Секретный код *</label>
        <input
          type="text"
          bind:value={secretCode}
          placeholder="Придумайте код (например: SantaHelper123)"
          class="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
        />
        <p class="mt-2 text-sm text-slate-400">
          ⚠️ Запомните этот код! Он понадобится для отмены брони или изменения статуса.
        </p>
      </div>
    </div>

    <!-- Footer -->
    <div class="px-8 py-6 border-t border-slate-700/50 flex gap-3 justify-end">
      <button
        on:click={() => dispatch('close')}
        class="px-6 py-3 rounded-xl font-semibold text-slate-300 hover:text-white bg-slate-700/50 hover:bg-slate-700 border border-slate-600/50 transition-all duration-300"
      >
        Отмена
      </button>
      <button
        on:click={handleSubmit}
        class="px-6 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-indigo-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 transition-all duration-300 hover:-translate-y-0.5"
      >
        Забронировать
      </button>
    </div>
  </div>
</div>
