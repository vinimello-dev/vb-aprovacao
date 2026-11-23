/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fff5f2',
          100: '#ffe8e2',
          200: '#ffd5c9',
          300: '#ffb5a3',
          400: '#ff7f61',
          500: '#FD3100', // Laranja Elétrico da Marca VB
          600: '#e02b00',
          700: '#b82300',
          800: '#941e04',
          900: '#7a1d09',
        },
        agency: {
          bg: '#EEEDEA',
          card: '#FFFFFF',
          border: '#DCD6CC',
          dark: '#111111',
          muted: '#625F59',
        },
      },
    },
  },
  plugins: [],
};
