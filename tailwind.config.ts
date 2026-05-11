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
        navy: "#1E293B",
        "header-footer": "#AFC7CE",
        cta: "#7FAFC0",
        "cta-hover": "#6799AA",
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
      backgroundImage: {
        "section-sage": "linear-gradient(135deg, #f8f7f4 0%, #eef4f3 100%)",
        "section-cta-gradient": "linear-gradient(120deg, #f8f7f4, #eef4f3)",
      },
    },
  },
  plugins: [],
};
export default config;
