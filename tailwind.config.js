/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Geist', 'sans-serif'],
        mono: ['"Geist Mono"', 'monospace'],
      },
      colors: {
        surface: {
          base: 'var(--surface-base)',
          primary: 'var(--surface-primary)',
          'primary-subtle': 'var(--surface-primary-subtle)',
          'primary-hover': 'var(--surface-primary-hover)',
          secondary: 'var(--surface-secondary)',
          'secondary-subtle': 'var(--surface-secondary-subtle)',
          accent: 'var(--surface-accent)',
          info: 'var(--surface-info)',
          success: 'var(--surface-success)',
        },
        action: {
          primary: 'var(--action-primary)',
          'primary-hover': 'var(--action-primary-hover)',
          'primary-click': 'var(--action-primary-click)',
          secondary: 'var(--action-secondary)',
          'secondary-hover': 'var(--action-secondary-hover)',
          'secondary-click': 'var(--action-secondary-click)',
        },
        border: {
          primary: 'var(--border-primary)',
          'primary-light': 'var(--border-primary-light)',
          'action-primary': 'var(--border-action-primary)',
          success: 'var(--border-success)',
        },
        content: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          tertiary: 'var(--text-tertiary)',
          subtle: 'var(--text-subtle)',
          info: 'var(--text-info)',
          success: 'var(--text-success)',
          warning: 'var(--text-warning)',
        },
        icon: {
          default: 'var(--icon-default)',
          secondary: 'var(--icon-secondary)',
          info: 'var(--icon-info)',
          success: 'var(--icon-success)',
        },
      },
    },
  },
  plugins: [],
};
