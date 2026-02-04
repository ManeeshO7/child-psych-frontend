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
          50: "#fdfcfb",
          100: "#f9f7f4",
          200: "#f2ede6",
          300: "#e8e0d4",
        },
        warm: {
          brown: "#8b7355",
          gold: "#a68b5b",
          tan: "#c4a574",
          sand: "#e8dcc8",
        },
      },
    },
  },
  plugins: [],
};
export default config;
