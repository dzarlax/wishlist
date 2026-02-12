/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./src/**/*.{html,js,svelte,ts}'],
  theme: {
    extend: {
      colors: {
        ivory: '#FCFAF7',
        graphite: '#1A1A1E',
        'dark-bg': '#0D0D0F',
        'dark-text': '#F5F5F5',
        surface: '#E8E6E3',
        'surface-dark': '#1A1D21',
        'surface-hover': '#F5F5F3',
        'surface-hover-dark': '#25282D',
        // Dark theme button colors (better contrast)
        'btn-dark': '#18181B',
        'btn-dark-hover': '#25282D',
        // Priority colors
        'priority-hot': '#DC2626',
        'priority-hot-bg': '#FEF2F2',
        'priority-medium': '#D97706',
        'priority-medium-bg': '#FEFBEB',
        'priority-low': '#2563EB',
        'priority-low-bg': '#F0F9FF',
        // Status colors
        'status-available': '#059669',
        'status-reserved': '#D97706',
        'status-purchased': '#7C3AED',
        // Text colors
        'text-primary': '#1A1A1E',
        'text-secondary': '#6B7280',
        'text-muted': '#737373',
      },
      boxShadow: {
        editorial: '0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-2px_rgba(0,0,0,0.06)',
        'editorial-lg': '0_8px_30px_rgb(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.06)',
        raised: '0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-2px_rgba(0,0,0,0.06)',
      },
      fontFamily: {
        editorial: ['Georgia', 'Times New Roman', 'serif'],
      },
      borderRadius: {
        'modal': '8px',
        'btn-icon': '9999px',
        'input': '4px',
      },
      opacity: {
        'overlay': '0.5',
        'disabled': '0.5',
      },
      spacing: {
        'input': '16px',
        'modal': '28px',
        'filter-gap': '8px',
        'chip-padding': '12px',
      },
    },
  },
  plugins: [
    {
      plugin: ({ addBase, addComponents }) => {
        addBase({
          ...addComponents({
            scrollbarHide: '.scrollbar-hide',
          })
        );
      }),
    },
    {
      plugin: ({ addBase, addComponents }) => {
        addBase({
          ...addComponents({
            scrollbarHide: '.scrollbar-hide',
          })
        );
      }),
    },
  ],
};
