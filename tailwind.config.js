/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ledger: {
          bg: '#FBF8F1',
          surface: '#FFFFFF',
          ink: '#1F2430',
          muted: '#5B6372',
          border: '#E7E1D3',
          teal: {
            DEFAULT: '#0F766E',
            hover: '#115E59',
            light: '#CCFBF1',
          },
          expense: {
            DEFAULT: '#B42318',
            hover: '#912018',
            light: '#FEE4E2',
          },
          received: {
            DEFAULT: '#15803D',
            hover: '#166534',
            light: '#DCFCE7',
          },
          lent: {
            DEFAULT: '#B45309',
            hover: '#92400E',
            light: '#FEF3C7',
          },
          repayment: {
            DEFAULT: '#1D4ED8',
            hover: '#1E40AF',
            light: '#DBEAFE',
          },
          transfer: {
            DEFAULT: '#6D5BD0',
            hover: '#5845BD',
            light: '#EDE9FE',
          },
          // Dark mode surfaces
          dark: {
            bg: '#14171C',
            surface: '#1D2128',
            surfaceHover: '#252B34',
            border: '#2E3541',
            ink: '#E6EDF3',
            muted: '#8B949E'
          }
        }
      },
      fontFamily: {
        devanagari: ['"Tiro Devanagari Marathi"', '"Noto Sans Devanagari"', 'system-ui', 'sans-serif'],
        sans: ['Inter', '"Tiro Devanagari Marathi"', '"Noto Sans Devanagari"', 'system-ui', 'sans-serif'],
      },
      minHeight: {
        'tap': '56px',
        'button-lg': '64px',
      },
      minWidth: {
        'tap': '56px',
        'button-lg': '64px',
      }
    },
  },
  plugins: [],
}
