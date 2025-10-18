/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        status: {
          green: '#0f8554',
          yellow: '#ffff33',
          red: '#cc3333',
          neutral: '#d1dbdd'
        }
      },
      boxShadow: {
        card: '0 10px 15px -3px rgba(15, 133, 84, 0.05), 0 4px 6px -4px rgba(0, 0, 0, 0.1)'
      }
    }
  },
  plugins: []
};
