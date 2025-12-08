/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
      "./src/**/*.{js,jsx,ts,tsx}",
    ],
    theme: {
      extend: {
        colors: {
          primary: {
            light: '#4DA8DA',
            DEFAULT: '#007ACC',
            dark: '#005C99',
          },
          secondary: {
            light: '#F4F4F6',
            DEFAULT: '#E5E5E5',
            dark: '#C4C4C4',
          },
          accent: {
            DEFAULT: '#FF6B6B',
          },
          success: {
            DEFAULT: '#4CAF50',
          },
          warning: {
            DEFAULT: '#FFC107',
          },
        },
        fontFamily: {
          sans: ['Inter', 'sans-serif'],
        },
      },
    },
    plugins: [],
  }