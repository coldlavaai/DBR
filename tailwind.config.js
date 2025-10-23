/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        coldlava: {
          primary: '#0a0a33',
          secondary: '#1a1a4a',
          tertiary: '#2a2a5a',
          cyan: '#02bbd4',
          yellow: '#ffe14d',
          pink: '#ff44cc',
          purple: '#8a2be2',
          gold: '#ffd700',
        },
      },
      backgroundImage: {
        'gradient-coldlava': 'linear-gradient(135deg, #0a0a33 0%, #1a1a4a 50%, #2a2a5a 100%)',
        'gradient-cyan': 'linear-gradient(135deg, #02bbd4, #4a90e2)',
        'gradient-yellow': 'linear-gradient(135deg, #ffe14d, #ffb347)',
        'gradient-pink': 'linear-gradient(135deg, #ff44cc, #e73c7e)',
        'gradient-gold': 'linear-gradient(135deg, #ffd700, #ffed4e)',
        'gradient-luxury': 'linear-gradient(45deg, #02bbd4, #ffe14d, #ff44cc, #8a2be2, #ffd700)',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite',
        'slide-up': 'slideUp 0.5s ease-out',
        'fade-in': 'fadeIn 0.3s ease-out',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        glow: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
