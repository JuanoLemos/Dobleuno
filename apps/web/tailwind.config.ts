import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Brand — definidos en docs/Sources.md
        forge: {
          0: '#0a0a0a',
          1: '#141414',
          2: '#1c1c1c',
          3: '#262626',
          4: '#2e2e2e',
        },
        blood: {
          50: '#fbeaea',
          100: '#f3cdcd',
          200: '#d97070',
          400: '#c41e3a',
          500: '#a01919',
          600: '#7e1313',
          700: '#5e0e0e',
          800: '#3e0808',
        },
        bronze: {
          100: '#f5ecd6',
          200: '#e0c283',
          400: '#c19446',
          500: '#b8860b',
          600: '#9a700a',
          700: '#7d5a07',
        },
        parchment: {
          50: '#f7f5f0',
          100: '#ede8d9',
          200: '#e1d9c2',
          300: '#c8bca1',
        },
        ink: {
          DEFAULT: '#14171e',
          soft: '#3a4256',
          muted: '#7c7a72',
        },
      },
      fontFamily: {
        serif: ['"DM Serif Display"', 'serif'],
        sans: ['Outfit', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        soft: '0 2px 8px rgba(0,0,0,0.4)',
        lifted: '0 8px 24px -4px rgba(0,0,0,0.5)',
        glow: '0 0 0 1px rgba(160,25,25,0.3), 0 4px 12px -2px rgba(160,25,25,0.3)',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'slide-up': {
          from: { transform: 'translateY(8px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
      },
      animation: {
        'fade-in': 'fade-in 200ms ease-out',
        'slide-up': 'slide-up 250ms ease-out',
      },
    },
  },
  plugins: [],
};

export default config;
