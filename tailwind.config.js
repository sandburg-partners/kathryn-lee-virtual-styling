/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'brand-primary': '#4a4a4a',
        'brand-secondary': '#f0e9e1',
        'brand-accent': '#B59677',
      },
      fontFamily: {
        sans: ['"Cormorant Garamond"', 'serif'],
        serif: ['"Playfair Display"', 'serif'],
      }
    },
  },
  plugins: [],
}
