import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fdf6f4',
          100: '#fbece7',
          200: '#f6d7cd',
          300: '#eeb8a7',
          400: '#e38c73',
          500: '#DA5735', // Laranja Terracota oficial da marca
          600: '#c54423',
          700: '#a33519',
          800: '#832e19',
          900: '#6c2b1a',
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

export default config;
