/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#000000',
          hover: '#1a1a1a'
        },
        shadow: {
          DEFAULT: '#F5F5F5',
          dark: '#E5E5E5'
        }
      },
      fontFamily: {
        mono: ['Geist Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}