/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        accent: '#58a6ff',
        surface: '#1a2332',
        border: '#2d3a4d',
        muted: '#8b949e',
        success: '#3fb950',
        warning: '#d29922',
        error: '#f85149',
        'bg-dark': '#0f1419',
      },
      fontFamily: {
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
