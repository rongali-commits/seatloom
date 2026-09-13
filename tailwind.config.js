/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#1a1614',
          soft: '#3d3633',
          muted: '#6b625e',
          faint: '#9a908c',
        },
        paper: {
          DEFAULT: '#faf8f5',
          warm: '#f5f1ec',
          card: '#ffffff',
          panel: '#f3edf7',
          lilac: '#e8dff0',
          lilacDeep: '#d4c3e3',
        },
        plum: {
          50: '#f6f0f8',
          100: '#ead9ef',
          200: '#d4b3df',
          300: '#be8dcf',
          400: '#a867bf',
          500: '#8b4a9e',
          600: '#6f3a80',
          700: '#562d63',
          800: '#3d2050',
          900: '#2a1538',
        },
        sage: {
          50: '#f0f5f0',
          100: '#d9e8d9',
          500: '#6b8e6b',
          600: '#567556',
        },
        gold: {
          400: '#c9a96e',
          500: '#b8965a',
          600: '#9e7e48',
        },
      },
      fontFamily: {
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
        display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        serif: ['"Newsreader"', 'Georgia', 'serif'],
      },
      fontSize: {
        'display': ['clamp(2.75rem, 6vw, 5rem)', { lineHeight: '1.02', letterSpacing: '-0.03em', fontWeight: '700' }],
        'headline': ['clamp(1.75rem, 3.5vw, 2.75rem)', { lineHeight: '1.08', letterSpacing: '-0.02em', fontWeight: '700' }],
        'title': ['clamp(1.25rem, 2vw, 1.5rem)', { lineHeight: '1.2', letterSpacing: '-0.01em', fontWeight: '600' }],
      },
      maxWidth: {
        'prose-narrow': '38rem',
        'content': '1200px',
      },
      borderColor: {
        DEFAULT: '#e8e2dc',
      },
    },
  },
  plugins: [],
};
