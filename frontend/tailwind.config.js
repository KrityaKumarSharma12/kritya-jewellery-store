/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        gold: {
          50: '#FBF6E9',
          100: '#F5E8C8',
          200: '#EED4A4',
          300: '#E6C080',
          400: '#DFAC5C',
          500: '#D4943C',
          600: '#C07A2F',
          700: '#A86322',
          800: '#8A4E18',
          900: '#6B3B0F',
          950: '#4A280A',
        },
        dark: {
          bg: '#0A0A0A',
          card: '#141414',
          border: '#2A2A2A',
          text: '#E5E5E5',
          muted: '#6B6B6B',
        },
        light: {
          bg: '#FAFAFA',
          card: '#FFFFFF',
          border: '#E5E5E5',
          text: '#1A1A1A',
          muted: '#8A8A8A',
        }
      },
      fontFamily: {
        playfair: ['"Playfair Display"', 'serif'],
        inter: ['Inter', 'sans-serif'],
        poppins: ['Poppins', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.6s ease-in-out',
        'slide-up': 'slideUp 0.6s ease-out',
        'slide-down': 'slideDown 0.6s ease-out',
        'scale-in': 'scaleIn 0.5s ease-out',
        'float': 'float 6s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite',
        'shimmer': 'shimmer 2s infinite',
        'bounce-slow': 'bounce 2s infinite',
        'pulse-slow': 'pulse 3s infinite',
        'spin-slow': 'spin 3s linear infinite',
        'gradient': 'gradient 3s ease infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.9)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        glow: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(192, 122, 47, 0.3)' },
          '50%': { boxShadow: '0 0 40px rgba(192, 122, 47, 0.6)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        gradient: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
      },
      backgroundSize: {
        '300%': '300% 300%',
        '200%': '200% 200%',
      },
      boxShadow: {
        'premium': '0 20px 60px -15px rgba(0, 0, 0, 0.3)',
        'premium-gold': '0 20px 60px -15px rgba(192, 122, 47, 0.4)',
        'glow': '0 0 40px rgba(192, 122, 47, 0.2)',
      },
      backdropBlur: {
        'xl': '20px',
        '2xl': '40px',
      },
    },
  },
  plugins: [], // Remove plugins that are causing issues
}