/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        void: {
          bg: '#000000',
          card: '#080808',
          border: 'rgba(255, 255, 255, 0.05)',
          accent: '#a00303',
          textMuted: '#888888',
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      cursor: {
        crosshair: 'crosshair',
      }
    },
  },
  plugins: [],
}