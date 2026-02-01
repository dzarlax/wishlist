import { writable } from 'svelte/store';

function createToastStore() {
  const { subscribe, update } = writable([]);

  // Add a new toast
  function add(message, options = {}) {
    const id = Date.now() + Math.random();
    const toast = {
      id,
      message,
      type: options.type || 'info', // 'success', 'error', 'info'
      duration: options.duration || 3000,
      ...options
    };

    update(toasts => [...toasts, toast]);

    // Auto-remove after duration
    if (toast.duration > 0) {
      setTimeout(() => {
        remove(id);
      }, toast.duration);
    }

    return id;
  }

  // Remove a toast
  function remove(id) {
    update(toasts => toasts.filter(t => t.id !== id));
  }

  // Clear all toasts
  function clear() {
    update(() => []);
  }

  // Convenience methods
  function success(message, options = {}) {
    return add(message, { ...options, type: 'success' });
  }

  function error(message, options = {}) {
    return add(message, { ...options, type: 'error', duration: 5000 });
  }

  function info(message, options = {}) {
    return add(message, { ...options, type: 'info' });
  }

  return {
    subscribe,
    add,
    remove,
    clear,
    success,
    error,
    info
  };
}

export const toasts = createToastStore();
