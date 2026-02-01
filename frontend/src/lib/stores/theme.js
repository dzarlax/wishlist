import { writable } from 'svelte/store';

// Check if we're in browser
const browser = typeof window !== 'undefined';

// Initialize theme from localStorage or system preference
function getInitialTheme() {
  if (!browser) return 'dark';

  const stored = localStorage.getItem('theme');
  if (stored) return stored;

  // Check system preference
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }

  return 'light';
}

function createThemeStore() {
  const { subscribe, set, update } = writable(getInitialTheme());

  return {
    subscribe,
    set: (value) => {
      if (browser) {
        console.log('Setting theme to:', value);
        localStorage.setItem('theme', value);
        if (value === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
        console.log('Document classes:', document.documentElement.classList.toString());
      }
      set(value);
    },
    toggle: () => {
      update(current => {
        const newTheme = current === 'dark' ? 'light' : 'dark';
        console.log('Toggling theme from', current, 'to', newTheme);
        if (browser) {
          localStorage.setItem('theme', newTheme);
          if (newTheme === 'dark') {
            document.documentElement.classList.add('dark');
          } else {
            document.documentElement.classList.remove('dark');
          }
          console.log('Document classes after toggle:', document.documentElement.classList.toString());
        }
        return newTheme;
      });
    }
  };
}

export const theme = createThemeStore();

// Initialize on load
if (browser) {
  const initialTheme = getInitialTheme();
  if (initialTheme === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}
