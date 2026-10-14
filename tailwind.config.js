/** SH A1 English WebApp design tokens, taken from the logo mark. */
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url)).replace(/\\/g, '/');

/** @type {import('tailwindcss').Config} */
export default {
  content: [`${here}index.html`, `${here}src/**/*.{ts,tsx}`],
  theme: {
    extend: {
      colors: {
        navy: { DEFAULT: '#161E54', 50: '#EEF0FA', 100: '#DCE0F3', 200: '#B5BCE4', 300: '#8590CF', 400: '#4F5BA8', 500: '#2D387A', 600: '#161E54', 700: '#111745', 800: '#0C1033', 900: '#070A21' },
        coral: { DEFAULT: '#FF5151', 50: '#FFF1F1', 100: '#FFE0E0', 200: '#FFC2C2', 300: '#FF9494', 400: '#FF6B6B', 500: '#FF5151', 600: '#E43F3D', 700: '#C8322F', 800: '#9E2523', 900: '#6E1817' },
        sky: { DEFAULT: '#88E0EF', 50: '#EFFBFD', 100: '#DDF6FA', 200: '#BDEEF6', 300: '#88E0EF', 400: '#4FCBE0', 500: '#25AFC7', 600: '#1A8BA0', 700: '#176F80', 800: '#155A68', 900: '#0F3F49' },
        mint: { DEFAULT: '#1F9D6B', 50: '#E9F8F1', 100: '#CFF0E1', 500: '#1F9D6B', 600: '#178257', 700: '#126845' },
        sun: { DEFAULT: '#FFC14D', 50: '#FFF8E8', 100: '#FFEFC7', 500: '#FFC14D', 700: '#9A6400' },
        paper: '#F6F7FB',
      },
      fontFamily: {
        sans: ['Calibri', 'Carlito', '"Segoe UI"', 'system-ui', '-apple-system', 'Roboto', 'sans-serif'],
        arabic: ['"Noto Sans Arabic"', '"Segoe UI"', 'Tahoma', 'sans-serif'],
      },
      borderRadius: { xl: '0.875rem', '2xl': '1.25rem', '3xl': '1.75rem' },
      boxShadow: {
        card: '0 1px 2px rgba(22,30,84,0.06), 0 6px 20px -8px rgba(22,30,84,0.16)',
        lift: '0 2px 4px rgba(22,30,84,0.08), 0 16px 40px -12px rgba(22,30,84,0.28)',
      },
      keyframes: {
        pop: { '0%': { transform: 'scale(0.92)', opacity: '0' }, '100%': { transform: 'scale(1)', opacity: '1' } },
        rise: { '0%': { transform: 'translateY(8px)', opacity: '0' }, '100%': { transform: 'translateY(0)', opacity: '1' } },
        wiggle: { '0%,100%': { transform: 'rotate(0)' }, '25%': { transform: 'rotate(-4deg)' }, '75%': { transform: 'rotate(4deg)' } },
      },
      animation: { pop: 'pop .25s ease-out', rise: 'rise .3s ease-out', wiggle: 'wiggle .5s ease-in-out' },
    },
  },
  plugins: [],
};
