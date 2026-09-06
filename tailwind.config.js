/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './App.tsx',
    './index.tsx',
    './constants.tsx',
    './components/**/*.{js,ts,jsx,tsx}',
    './hooks/**/*.{js,ts,jsx,tsx}',
    './utils/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Sora', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['"Space Grotesk"', '"Bebas Neue"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        crimson: {
          50: '#fff1f1',
          100: '#ffe1e1',
          200: '#ffc7c7',
          300: '#ffa0a0',
          400: '#ff6b6b',
          500: '#f03e3e',
          600: '#e03131',
          700: '#c92a2a',
          800: '#a61e1e',
          900: '#8b1818',
        },
      },
      boxShadow: {
        subtle: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        elevated: '0 4px 20px -2px rgba(0, 0, 0, 0.08), 0 2px 6px -2px rgba(0, 0, 0, 0.04)',
        'elevated-dark': '0 10px 30px -4px rgba(0, 0, 0, 0.5), 0 2px 8px -2px rgba(0, 0, 0, 0.3)',
        highlight: 'inset 0 1px 0 0 rgba(255, 255, 255, 0.08)',
      },
    },
  },
  plugins: [],
};
