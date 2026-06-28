/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        // Display = serif (Paper hero feel), sans = Inter for UI, mono = JetBrains for logs
        display: ['"Instrument Serif"', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        // paper palette (cream)
        paper: {
          50:  '#fdfcf7',   // page bg
          100: '#f7f4ea',   // card/panel
          200: '#efeadb',   // soft edge
          300: '#e3dcc8',   // line
          400: '#b9b3a1',   // muted ink
          500: '#8a8675',   // secondary ink
          600: '#5a574c',   // body ink
          900: '#1a1a1a',   // strong ink
        },
        ink:   '#1a1a1a',
        blue:  '#8aa6ff',
        olive: '#6b7d3f',
        rust:  '#a8552c',
      },
      fontSize: {
        '2xs': ['11px', '15px'],
        xs:   ['12px', '17px'],
        sm:   ['13.5px', '20px'],
        base: ['15px', '23px'],
      },
      letterSpacing: {
        tightish: '-0.015em',
        tighter:  '-0.025em',
      },
      borderRadius: { xl: '16px', lg: '10px', md: '7px' },
      boxShadow: {
        window: '0 1px 0 rgba(0,0,0,0.04), 0 8px 24px -8px rgba(0,0,0,0.12), 0 24px 48px -16px rgba(0,0,0,0.08)',
        card:   '0 1px 2px rgba(0,0,0,0.04), 0 4px 12px -4px rgba(0,0,0,0.06)',
        soft:   '0 1px 2px rgba(0,0,0,0.06)',
      },
      transitionTimingFunction: { paper: 'cubic-bezier(0.2,0,0,1)' },
    },
  },
  plugins: [],
};
