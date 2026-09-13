/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ink:   'rgb(var(--c-ink) / <alpha-value>)',
        muted: 'rgb(var(--c-muted) / <alpha-value>)',
        bg:    'rgb(var(--c-bg) / <alpha-value>)',
        surf:  'rgb(var(--c-surf) / <alpha-value>)',
        line:  'rgb(var(--c-line) / <alpha-value>)',
        brand: 'rgb(var(--c-brand) / <alpha-value>)',
        gold:  'rgb(var(--c-gold) / <alpha-value>)'
      },
      fontFamily: {
        arabic: ['var(--font-arabic)', 'Amiri Quran', 'Traditional Arabic', 'serif'],
        ui: ['ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif']
      }
    }
  },
  plugins: []
}
