/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx,svelte}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#e7f1eb',
          100: '#cfe3d7',
          200: '#9fc7af',
          300: '#6fab87',
          400: '#3f8f5f',
          500: '#1b6934', // main green
          600: '#17592c',
          700: '#134924',
          800: '#0f391c',
          900: '#0b2914',
          950: '#081f0f',
        },
      },
    },
  },
  plugins: [],
};
