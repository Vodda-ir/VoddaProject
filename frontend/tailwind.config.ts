import type { Config } from 'tailwindcss';

// Vodda design tokens — soft olive + earthy sand neutrals (see docs/design/styles.css)
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        sand: {
          50: '#FAF8F2',
          100: '#F4F0E7',
          150: '#EDE8DB',
          200: '#E4DDCC',
        },
        surface: { DEFAULT: '#FFFFFF', warm: '#FCFAF4' },
        olive: {
          50: '#F2F5EA',
          100: '#E8ECDB',
          200: '#D6DCC4',
          300: '#B6C09B',
          400: '#93A172',
          500: '#728350',
          600: '#5E6E43',
          700: '#4C5A36',
          800: '#3C472B',
          900: '#2E3622',
        },
        ink: {
          DEFAULT: '#2A2820',
          2: '#565247',
          3: '#8C8675',
          4: '#ABA593',
        },
        gold: { DEFAULT: '#BF9540', soft: '#E7D5A8', bg: '#F7EFD9' },
        clay: { DEFAULT: '#B0745A', bg: '#F6E7DF' },
        rose: '#A65151',
        info: '#5E7E8C',
      },
      borderRadius: {
        xs: '10px',
        sm: '14px',
        md: '18px',
        lg: '24px',
        xl: '30px',
      },
      boxShadow: {
        sm: '0 1px 3px rgba(46,54,34,.05), 0 1px 2px rgba(46,54,34,.04)',
        md: '0 6px 22px rgba(46,54,34,.07), 0 2px 6px rgba(46,54,34,.04)',
        lg: '0 14px 40px rgba(46,54,34,.10), 0 4px 12px rgba(46,54,34,.05)',
        olive: '0 10px 28px rgba(76,90,54,.28)',
      },
      fontFamily: {
        sans: ['Yekan Bakh', 'Vazirmatn', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
