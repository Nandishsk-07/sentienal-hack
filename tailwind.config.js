/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#00FFD1',     // Cyan
        danger: '#FF3B3B',      // Red
        background: '#0A0E1A',  // Near Black
        surface: '#111827',     // Dark Gray/Blue Surface
        muted: '#1F2937'        // Muted gray
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        'glow-cyan': '0 0 10px rgba(0, 255, 209, 0.5), 0 0 20px rgba(0, 255, 209, 0.3)',
        'glow-red': '0 0 10px rgba(255, 59, 59, 0.5), 0 0 20px rgba(255, 59, 59, 0.3)',
      }
    },
  },
  plugins: [],
}
