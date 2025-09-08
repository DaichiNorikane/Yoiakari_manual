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
        soft: '#f1f5f9',
      },
    },
  },
  plugins: [],
} satisfies Config

