import type { Config } from 'tailwindcss'

export default {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        card: '#ffffff',
        ink: '#0f172a',
        soft: '#f6f8fb',
        brand: '#7c9cff',
        mint: '#A7F3D0',
        peach: '#FECACA',
        sky: '#BFDBFE',
        lavender: '#C7D2FE',
        blush: '#FBCFE8',
      },
    },
  },
  plugins: [],
} satisfies Config
