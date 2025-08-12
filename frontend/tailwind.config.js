/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
    extend: {
      colors: {
        'frnsw-red': '#cc0000',
        'frnsw-dark-red': '#990000',
        'frnsw-light-red': '#ffebee',
        'frnsw-blue': '#1976d2',
        'frnsw-dark-blue': '#0d47a1',
        'frnsw-gray': {
          50: '#fafafa',
          100: '#f5f5f5',
          200: '#eeeeee',
          300: '#e0e0e0',
          400: '#bdbdbd',
          500: '#9e9e9e',
          600: '#757575',
          700: '#616161',
          800: '#424242',
          900: '#212121'
        }
      },
      fontFamily: {
        'sans': ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem'
      },
      screens: {
        'xs': '475px',
        'standalone': { 'raw': '(display-mode: standalone)' }
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite'
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        slideUp: {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        },
        slideDown: {
          '0%': { transform: 'translateY(-100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        }
      },
      boxShadow: {
        'frnsw': '0 4px 6px -1px rgba(204, 0, 0, 0.1), 0 2px 4px -1px rgba(204, 0, 0, 0.06)',
        'frnsw-lg': '0 10px 15px -3px rgba(204, 0, 0, 0.1), 0 4px 6px -2px rgba(204, 0, 0, 0.05)'
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
    require('@tailwindcss/aspect-ratio')
  ],
  safelist: [
    'bg-green-500',
    'bg-red-500',
    'bg-yellow-500',
    'bg-blue-500',
    'text-green-600',
    'text-red-600',
    'text-yellow-600',
    'text-blue-600',
    'border-green-500',
    'border-red-500',
    'border-yellow-500',
    'border-blue-500'
  ]
}