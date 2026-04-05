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
        'surface': '#faf9f8',
        'surface-container': '#eeeeed',
        'surface-container-high': '#e9e8e7',
        'surface-container-highest': '#e3e2e1',
        'surface-container-low': '#f4f3f2',
        'surface-container-lowest': '#ffffff',
        'surface-dim': '#dadad9',
        'surface-variant': '#e3e2e1',
        'primary': '#162839',
        'primary-container': '#2c3e50',
        'on-primary': '#ffffff',
        'on-surface': '#1a1c1c',
        'on-surface-variant': '#43474c',
        'outline': '#74777d',
        'outline-variant': '#c4c6cd',
        'secondary': '#48626e',
        'secondary-container': '#cbe7f5',
        'on-secondary': '#ffffff',
        'tertiary': '#342400',
        'tertiary-container': '#503800',
        'tertiary-fixed-dim': '#e9c176',
        'error': '#ba1a1a',
        'error-container': '#ffdad6',
        'on-error': '#ffffff',
        'success': '#146c2e',
        'on-success': '#ffffff',
      },
      fontFamily: {
        'serif': ['Noto Serif', 'serif'],
        'sans': ['Manrope', 'sans-serif'],
      },
      spacing: {
        '16': '4rem',
        '20': '5rem',
      },
    },
  },
  plugins: [],
}