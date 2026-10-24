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
        background: "var(--background)",
        foreground: "var(--foreground)",
        brand: {
          50: "#F2FAF6",
          100: "#E8F7EF",
          200: "#C7EED8",
          300: "#98DFBA",
          400: "#5EC897",
          500: "#07865B",
          600: "#066747",
          700: "#055239",
          800: "#04412E",
          900: "#033324",
          primary: "#07865B",
          dark: "#066747",
          surface: "#FFFFFF",
          bg: "#F7F8F7",
          text: "#171A19",
          muted: "#707875",
          border: "#E7EBE8",
          success: "#E8F7EF",
        },
      },
      boxShadow: {
        soft: "0 2px 8px -2px rgba(16, 24, 40, 0.05), 0 1px 4px -1px rgba(16, 24, 40, 0.03)",
        card: "0 4px 16px -4px rgba(16, 24, 40, 0.06), 0 2px 6px -2px rgba(16, 24, 40, 0.04)",
        elevated: "0 12px 32px -8px rgba(16, 24, 40, 0.08), 0 4px 12px -2px rgba(16, 24, 40, 0.03)",
      },
      borderRadius: {
        card: "18px",
        control: "12px",
      },
    },
  },
  plugins: [],
};
export default config;
