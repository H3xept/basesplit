import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#F4A259',
          light: '#F4A259',
          dark: '#E89440',
        },
        secondary: {
          DEFAULT: '#5A3A1A',
          light: '#8B6F47',
          dark: '#3D2612',
        },
        dark: {
          bg: '#1F1912',
          card: '#2A2419',
          border: '#3D2F1F',
          hover: '#342B1F',
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-primary-dark': 'linear-gradient(135deg, #1F1912 0%, #2A2419 50%, #342B1F 100%)',
        'gradient-primary-light': 'linear-gradient(135deg, #F5F0E6 0%, #FDFCF9 50%, #E5DFD0 100%)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'scale-in': 'scaleIn 0.3s ease-out',
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
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
