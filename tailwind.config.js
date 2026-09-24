/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0A0A0A',
        paper: '#FFFFFF',
        mist: '#F5F4F1',
        line: '#E3E1DC',
        signal: { DEFAULT: '#C8102E', dark: '#9C0C24', light: '#FBE9EB' },
        slate: { DEFAULT: '#6B6862', light: '#9B9891' },
        ok: '#1A7A4C',
        warn: '#B8860B',
      },
      fontFamily: {
        display: ['var(--font-space-grotesk)', 'sans-serif'],
        sans: ['var(--font-inter)', 'sans-serif'],
        mono: ['var(--font-plex-mono)', 'monospace'],
      },
      borderRadius: { DEFAULT: '3px', lg: '4px' },
    },
  },
  plugins: [],
};
