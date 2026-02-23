import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: {
          50: "#f8f7f4",
          100: "#f0eeea",
          200: "#ebe9e4",
          300: "#e0ddd6",
        },
        warm: {
          brown: "#8b7355",
          gold: "#a68b5b",
          tan: "#c4a574",
          sand: "#e8dcc8",
          beige: "#ebe9e4",
        },
      },
    },
  },
  plugins: [],
};
export default config;
