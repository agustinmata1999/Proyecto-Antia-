import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  safelist: [
    'translate-x-0',
    '-translate-x-full',
    'lg:translate-x-0',
    '!translate-x-0',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#3B82F6',
          dark: '#2563EB',
        },
        background: '#FFFFFF',
        foreground: '#1F2937',
      },
    },
  },
  plugins: [],
};
export default config;
