/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef5ff',
          100: '#d9e8ff',
          200: '#bcd8ff',
          300: '#8ec0ff',
          400: '#599eff',
          500: '#3478ff',
          600: '#1a56f5',
          700: '#1443e1',
          800: '#1736b6',
          900: '#19338f',
          950: '#142157',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};
