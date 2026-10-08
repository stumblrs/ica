/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        atlas: {
          dark: '#0f172a',
          card: '#1e293b',
          border: '#334155',
          primary: '#10b981', // Emerald green
          accent: '#f59e0b',  // Gold/Amber
          danger: '#ef4444',
          muted: '#94a3b8',
        }
      },
    },
  },
  plugins: [],
};
