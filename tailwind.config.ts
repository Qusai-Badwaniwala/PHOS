import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./providers/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        /** Attribution only — see the note beside `--gold` in globals.css. */
        gold: {
          DEFAULT: "hsl(var(--gold))",
          foreground: "hsl(var(--gold-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        /* PHOS raw palette tokens — for direct use when needed */
        phos: {
          900: "#322D29",
          700: "#72383D",
          400: "#AC9C8D",
          200: "#D1C7BD",
          100: "#D9D9D9",
          50: "#EFE9E1",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: [
          "Inter",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
        arabic: ["Noto Naskh Arabic", "Traditional Arabic", "serif"],
      },
      /* Consistent spacing scale for PHOS */
      spacing: {
        "18": "4.5rem",
        "88": "22rem",
      },
      maxWidth: {
        "8xl": "90rem",
      },
      /* Subtle shadow scale */
      boxShadow: {
        card: "0 1px 3px 0 hsl(24 9% 18% / 0.06), 0 1px 2px -1px hsl(24 9% 18% / 0.06)",
        "card-hover": "0 4px 6px -1px hsl(24 9% 18% / 0.08), 0 2px 4px -2px hsl(24 9% 18% / 0.06)",
        "primary-card":
          "0 1px 3px 0 hsl(356 32% 33% / 0.12), 0 1px 2px -1px hsl(356 32% 33% / 0.08)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
