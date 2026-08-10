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
        /**
         * Status colours, named for meaning rather than hue.
         *
         * `success` not `emerald`, so the next screen that needs "this
         * went well" reaches for the product's green instead of
         * inventing one. Twenty files previously used stock Tailwind
         * palette entries, which belong to a different, cooler colour
         * system than PHOS's warm sand and maroon.
         *
         * `-muted` is the tinted surface each is legible on; every
         * combination is verified in `tests/unit/design-tokens.test.ts`.
         */
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
          muted: "hsl(var(--success-muted))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
          muted: "hsl(var(--warning-muted))",
        },
        info: {
          DEFAULT: "hsl(var(--info))",
          foreground: "hsl(var(--info-foreground))",
          muted: "hsl(var(--info-muted))",
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
      /*
       * Type scale — size, leading and tracking as one decision.
       *
       * These override Tailwind's stock `text-*` sizes rather than
       * adding new names, so every `text-sm` and `text-2xl` already in
       * the app gets the right optical treatment without touching a
       * single component. The app previously ran Tailwind's defaults,
       * which pair every size with the same tracking (none) — and a
       * fixed letter-spacing is wrong at some size by definition.
       *
       * Tracking is size-specific and moves *against* size: large text
       * reads too loose as it grows, so it tightens; small text needs a
       * little air to stay legible, so it opens. Leading moves the same
       * way — tight on a heading, comfortable on body copy.
       *
       * This is also why `h1..h6 { tracking-tight }` was removed from
       * globals.css: one tracking value applied to every heading level
       * is precisely the mistake this table exists to fix.
       */
      fontSize: {
        xs: ["0.75rem", { lineHeight: "1.45", letterSpacing: "0.01em" }],
        sm: ["0.875rem", { lineHeight: "1.55", letterSpacing: "0.005em" }],
        base: ["1rem", { lineHeight: "1.6", letterSpacing: "0em" }],
        lg: ["1.125rem", { lineHeight: "1.5", letterSpacing: "-0.005em" }],
        xl: ["1.25rem", { lineHeight: "1.4", letterSpacing: "-0.012em" }],
        "2xl": ["1.5rem", { lineHeight: "1.25", letterSpacing: "-0.018em" }],
        "3xl": ["1.875rem", { lineHeight: "1.15", letterSpacing: "-0.022em" }],
        "4xl": ["2.25rem", { lineHeight: "1.08", letterSpacing: "-0.026em" }],
        "5xl": ["3rem", { lineHeight: "1.04", letterSpacing: "-0.03em" }],
      },

      /*
       * Elevation, and what each level is *for*.
       *
       * The app had three near-identical 1px shadows, so every surface
       * sat at the same height and hierarchy was carried by font size
       * alone. These separate structural surfaces from interactive ones
       * and give the floating chrome a genuinely different weight:
       * bigger surfaces read as thicker.
       *
       * Two layers each — a tight contact shadow that grounds the edge,
       * and a wider ambient one that carries the height. Warm-tinted
       * rather than neutral black, so a raised card still belongs to the
       * sand palette instead of greying it.
       */
      boxShadow: {
        card: "0 1px 2px -1px hsl(24 9% 18% / 0.07), 0 2px 6px -2px hsl(24 9% 18% / 0.06)",
        "card-hover": "0 2px 4px -2px hsl(24 9% 18% / 0.09), 0 8px 20px -6px hsl(24 9% 18% / 0.10)",
        "primary-card":
          "0 1px 2px -1px hsl(356 32% 33% / 0.14), 0 4px 14px -4px hsl(356 32% 33% / 0.12)",
        /** Floating chrome: sheets, popovers, the mobile bar. Thicker on purpose. */
        raised: "0 2px 6px -2px hsl(24 9% 18% / 0.10), 0 16px 32px -12px hsl(24 9% 18% / 0.16)",
        /** Pressed state — the surface sinks toward the page. */
        pressed: "inset 0 1px 2px 0 hsl(24 9% 18% / 0.10)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
