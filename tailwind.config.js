/** @type {import('tailwindcss').Config} */
const token = (name) => `rgb(var(--${name}) / <alpha-value>)`

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      // Every color is a CSS variable defined in src/style.css (light + dark).
      colors: {
        bg: token('bg'),
        surface: token('surface'),
        fill: token('fill'),
        ink: token('ink'),
        muted: token('muted'),
        line: token('line'),
        primary: { DEFAULT: token('primary'), soft: token('primary-soft'), ink: token('primary-ink') },
        success: { DEFAULT: token('success'), soft: token('success-soft') },
        warning: { DEFAULT: token('warning'), soft: token('warning-soft') },
        danger: { DEFAULT: token('danger'), soft: token('danger-soft') },
      },
      borderRadius: { card: '18px' },
      boxShadow: { card: '0 1px 3px rgb(15 23 42 / 0.06)' },
      fontSize: {
        // 13px is the floor for any text in the app.
        xs: ['13px', '18px'],
      },
    },
  },
  plugins: [],
}
