/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'feen-blue': '#005A9E',
        'feen-dark': '#004880',
      }
    },
  },
  plugins: [],
}