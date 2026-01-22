<script>
  import { createEventDispatcher } from 'svelte';

  export let gift;

  const dispatch = createEventDispatcher();

  let imageError = false;

  async function handleReserve() {
    if (gift.status === 'available') {
      dispatch('reserve');
    } else if (gift.status === 'reserved') {
      const secretCode = prompt('Введите ваш секретный код для отметки "Куплено":');
      if (secretCode) {
        try {
          const response = await fetch(`/api/gifts/${gift.id}/purchased`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ secret_code: secretCode })
          });

          if (!response.ok) {
            const error = await response.json();
            alert(error.error || 'Ошибка');
            return;
          }

          dispatch('refresh');
        } catch (error) {
          alert('Ошибка при изменении статуса');
        }
      }
    }
  }

  async function handleUnreserve() {
    const secretCode = prompt('Введите ваш секретный код для отмены бронирования:');
    if (secretCode) {
      try {
        const response = await fetch(`/api/gifts/${gift.id}/unreserve`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ secret_code: secretCode })
        });

        if (!response.ok) {
          const error = await response.json();
          alert(error.error || 'Ошибка');
          return;
        }

        dispatch('refresh');
      } catch (error) {
        alert('Ошибка при отмене бронирования');
      }
    }
  }

  function getStatusBadge() {
    switch (gift.status) {
      case 'reserved':
        return { text: '🔒 Забронирован', class: 'bg-amber-500 text-white border-amber-400' };
      case 'purchased':
        return { text: '✅ Куплен', class: 'bg-emerald-600 text-white border-emerald-500' };
      default:
        return { text: '', class: '' };
    }
  }

  const status = getStatusBadge();
</script>

<div class="group relative flex flex-col bg-slate-900 rounded-lg overflow-hidden border border-slate-800 hover:border-slate-700">
  <!-- Image -->
  <div class="relative h-36 overflow-hidden bg-slate-800 flex-shrink-0">
    {#if gift.image_url && !imageError}
      <img
        src={gift.image_url}
        alt={gift.name}
        class="w-full h-full object-cover"
        on:error={() => imageError = true}
      />
    {:else}
      <div class="w-full h-full flex items-center justify-center text-4xl text-slate-600">🎁</div>
    {/if}

    <!-- Status Badge -->
    {#if status.text}
      <div class="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div class="px-4 py-2 rounded-lg text-base font-bold border-2 {status.class}">
          {status.text}
        </div>
      </div>
    {/if}
  </div>

  <!-- Content -->
  <div class="p-3 space-y-2 flex flex-col flex-1">
    <!-- Badges -->
    {#if gift.category}
      <div class="flex gap-1.5 flex-wrap">
        <span class="px-2 py-0.5 rounded text-xs text-slate-400 bg-slate-800">
          {gift.category}
        </span>
        <span class="px-2 py-0.5 rounded text-xs text-slate-400 bg-slate-800">
          {gift.priority}
        </span>
      </div>
    {/if}

    <!-- Title -->
    <h3 class="text-sm font-medium text-white">{gift.name}</h3>

    <!-- Description -->
    {#if gift.description}
      <p class="text-slate-500 text-xs">{gift.description}</p>
    {/if}

    <!-- Spacer -->
    <div class="flex-1"></div>

    <!-- Price & Actions -->
    {#if gift.price}
      <div class="flex items-center justify-between pt-2">
        <span class="text-sm font-semibold text-emerald-400">{gift.price}</span>
        <div class="flex gap-1">
          {#if gift.link}
            <a
              href={gift.link}
              target="_blank"
              rel="noopener"
              class="w-7 h-7 rounded bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-xs"
            >
              🔗
            </a>
          {/if}
          <button
            on:click={() => dispatch('edit')}
            class="w-7 h-7 rounded bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-xs"
          >
            ✏️
          </button>
          <button
            on:click={() => dispatch('delete')}
            class="w-7 h-7 rounded bg-slate-800 hover:bg-red-900/50 flex items-center justify-center text-xs"
          >
            🗑️
          </button>
        </div>
      </div>
    {/if}

    <!-- Action Button -->
    {#if gift.status === 'available'}
      <button
        on:click={handleReserve}
        class="w-full py-1.5 px-3 rounded text-xs font-medium text-white bg-slate-700 hover:bg-slate-600 border border-slate-600"
      >
        Забронировать
      </button>
    {:else if gift.status === 'reserved'}
      <div class="flex gap-1.5">
        <button
          on:click={handleReserve}
          class="flex-1 py-1.5 px-2 rounded text-xs font-medium text-white bg-slate-700 hover:bg-slate-600 border border-slate-600"
        >
          Куплено
        </button>
        <button
          on:click={handleUnreserve}
          class="flex-1 py-1.5 px-2 rounded text-xs font-medium text-red-300 bg-red-900/30 hover:bg-red-900/40 border border-red-900/50 hover:border-red-900/70"
        >
          Отменить
        </button>
      </div>
    {:else if gift.status === 'purchased'}
      <button
        on:click={handleUnreserve}
        class="w-full py-1.5 px-3 rounded text-xs font-medium text-amber-300 bg-amber-900/30 hover:bg-amber-900/40 border border-amber-900/50 hover:border-amber-900/70"
      >
        Отменить
      </button>
    {/if}
  </div>
</div>

<style>
  @keyframes card-appear {
    from {
      opacity: 0;
      transform: translateY(30px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .line-clamp-3 {
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
</style>
