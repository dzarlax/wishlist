<script>
  import { createEventDispatcher, onMount } from 'svelte';
  import { fade, fly } from 'svelte/transition';

  export let gift;

  const dispatch = createEventDispatcher();

  let name = '';
  let description = '';
  let category = '';
  let priority = '';
  let price = '';
  let link = '';
  let imageUrl = '';
  let adminPassword = '';
  let loading = false;
  let error = '';

  const categories = [
    '🔧 Электроника и гаджеты',
    '🏠 Умный дом',
    '🔋 Аксессуары',
    '📚 Обучение и развитие',
    '🎮 Игры и развлечения',
    '👔 Одежда и стиль',
    '🏃 Спорт и здоровье',
    '🎨 Творчество'
  ];

  const priorities = [
    '🔥 Очень хочу',
    '⭐ Было бы здорово',
    '💭 Просто мечта'
  ];

  onMount(() => {
    name = gift.name;
    description = gift.description || '';
    category = gift.category || '';
    priority = gift.priority;
    price = gift.price || '';
    link = gift.link || '';
    imageUrl = gift.image_url || '';
  });

  async function handleSubmit() {
    error = '';

    if (!name.trim()) {
      error = 'Введите название подарка';
      return;
    }

    if (!adminPassword) {
      error = 'Введите пароль администратора';
      return;
    }

    loading = true;

    try {
      const payload = {
        name: name.trim(),
        description: description.trim(),
        category,
        priority
      };

      if (price.trim()) payload.price = price.trim();
      if (link.trim()) payload.link = link.trim();
      if (imageUrl.trim()) payload.image_url = imageUrl.trim();

      const response = await fetch(`/api/gifts/${gift.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Password': adminPassword
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const err = await response.json();
        error = err.error || 'Ошибка при сохранении';
        return;
      }

      dispatch('saved');
    } catch (err) {
      error = 'Ошибка при сохранении изменений';
    } finally {
      loading = false;
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
    class="bg-slate-800 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-700/50 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
    transition:fly={{ y: 50, opacity: 0, duration: 300 }}
  >
    <!-- Header -->
    <div class="sticky top-0 z-10 bg-slate-800/95 backdrop-blur-xl px-8 py-6 border-b border-slate-700/50">
      <h2 class="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-pink-400 bg-clip-text text-transparent">
        ✏️ Редактировать подарок
      </h2>
    </div>

    <!-- Body -->
    <div class="p-8 space-y-6">
      <!-- Error Message -->
      {#if error}
        <div class="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      {/if}

      <!-- Name -->
      <div>
        <label class="block text-sm font-semibold text-slate-300 mb-2">Название *</label>
        <input
          type="text"
          bind:value={name}
          class="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
        />
      </div>

      <!-- Category & Priority -->
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-semibold text-slate-300 mb-2">Категория</label>
          <select
            bind:value={category}
            class="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
          >
            <option value="">Без категории</option>
            {#each categories as cat}
              <option value={cat}>{cat}</option>
            {/each}
          </select>
        </div>

        <div>
          <label class="block text-sm font-semibold text-slate-300 mb-2">Приоритет</label>
          <select
            bind:value={priority}
            class="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
          >
            {#each priorities as prio}
              <option value={prio}>{prio}</option>
            {/each}
          </select>
        </div>
      </div>

      <!-- Description -->
      <div>
        <label class="block text-sm font-semibold text-slate-300 mb-2">Описание</label>
        <textarea
          bind:value={description}
          rows="3"
          class="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none"
        ></textarea>
      </div>

      <!-- Price & Link -->
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-semibold text-slate-300 mb-2">Цена</label>
          <input
            type="text"
            bind:value={price}
            class="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
          />
        </div>

        <div>
          <label class="block text-sm font-semibold text-slate-300 mb-2">Ссылка</label>
          <input
            type="url"
            bind:value={link}
            class="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
          />
        </div>
      </div>

      <!-- Image URL -->
      <div>
        <label class="block text-sm font-semibold text-slate-300 mb-2">Ссылка на изображение</label>
        <input
          type="url"
          bind:value={imageUrl}
          class="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
        />
      </div>

      <!-- Admin Password -->
      <div>
        <label class="block text-sm font-semibold text-slate-300 mb-2">🔒 Пароль администратора *</label>
        <input
          type="password"
          bind:value={adminPassword}
          placeholder="Введите пароль"
          class="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
        />
      </div>
    </div>

    <!-- Footer -->
    <div class="sticky bottom-0 bg-slate-800/95 backdrop-blur-xl px-8 py-6 border-t border-slate-700/50 flex gap-3 justify-end">
      <button
        on:click={() => dispatch('close')}
        class="px-6 py-3 rounded-xl font-semibold text-slate-300 hover:text-white bg-slate-700/50 hover:bg-slate-700 border border-slate-600/50 transition-all duration-300"
      >
        Отмена
      </button>
      <button
        on:click={handleSubmit}
        disabled={loading}
        class="px-6 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-indigo-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 transition-all duration-300 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
      >
        {loading ? 'Сохранение...' : 'Сохранить'}
      </button>
    </div>
  </div>
</div>
