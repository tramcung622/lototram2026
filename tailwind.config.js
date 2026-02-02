/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-be-vietnam)', 'system-ui', 'sans-serif'],
      },
      colors: {
        loto: {
          red: '#c41e3a',
          gold: '#d4af37',
          dark: '#1a0a0e',
        },
      },
      animation: {
        'spin-slow': 'spin 2s linear infinite',
        'bounce-soft': 'bounce 1s ease-in-out',
      },
    },
  },
  plugins: [],
}
