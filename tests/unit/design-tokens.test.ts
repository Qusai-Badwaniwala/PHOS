import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The palette, held to WCAG AA by arithmetic rather than by eye.
 *
 * PHOS shipped with `--muted-foreground` at 3.59:1 on its own light
 * background — under AA for normal text, in the token that carries every
 * field description, card subtitle, empty state and the whole About
 * page. Roughly half the text in the application. `--border` was at
 * 1.39:1, effectively invisible.
 *
 * None of that was noticed by looking, because low contrast reads as
 * "calm" to a designer with a good monitor at midday, and PHOS is often
 * read at Fajr on a phone. So the values are checked by parsing the real
 * `globals.css` and computing the ratios — not by restating the numbers
 * here, which would only prove this file agrees with itself.
 *
 * Rule 9 in the operating rules: one source of truth for values, and a
 * test that fails if a literal appears anywhere else. Twenty components
 * had reached for stock Tailwind `emerald`/`amber`/`rose`/`sky` instead
 * of the palette, which is the same class of drift in a different
 * dimension; the last case below closes it.
 */

const ROOT = join(__dirname, "..", "..");
const CSS = readFileSync(join(ROOT, "app", "globals.css"), "utf8");

/** Pulls a token's `H S% L%` triple out of the `:root` or `.dark` block. */
function token(name: string, theme: "light" | "dark"): [number, number, number] {
  // `.dark { … }` is the second block; `:root { … }` the first.
  const darkStart = CSS.indexOf(".dark {");
  const scope = theme === "light" ? CSS.slice(0, darkStart) : CSS.slice(darkStart);
  const match = scope.match(new RegExp(`--${name}:\\s*([\\d.]+)\\s+([\\d.]+)%\\s+([\\d.]+)%`));
  if (!match) throw new Error(`Token --${name} not found in the ${theme} theme.`);
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

function hslToRgb([h, s, l]: [number, number, number]): [number, number, number] {
  const sn = s / 100;
  const ln = l / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = sn * Math.min(ln, 1 - ln);
  const f = (n: number) => ln - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [f(0), f(8), f(4)];
}

function relativeLuminance(rgb: [number, number, number]): number {
  const [r, g, b] = rgb.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

/** WCAG 2.1 contrast ratio between two tokens, rounded to 2dp. */
function contrast(a: [number, number, number], b: [number, number, number]): number {
  const la = relativeLuminance(hslToRgb(a));
  const lb = relativeLuminance(hslToRgb(b));
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return Math.round(((hi + 0.05) / (lo + 0.05)) * 100) / 100;
}

/** AA for normal text. The threshold PHOS previously failed. */
const TEXT_AA = 4.5;
/** WCAG 1.4.11, the boundary that lets a user identify a control. */
const CONTROL_AA = 3;

describe.each(["light", "dark"] as const)("the %s palette", (theme) => {
  const t = (name: string) => token(name, theme);

  const grounds = () => ({
    background: t("background"),
    card: t("card"),
    muted: t("muted"),
  });

  it.each(["foreground", "muted-foreground"])(
    "%s is readable on background, card and muted",
    (name) => {
      for (const [groundName, ground] of Object.entries(grounds())) {
        expect(
          contrast(t(name), ground),
          `--${name} on --${groundName} (${theme})`,
        ).toBeGreaterThanOrEqual(TEXT_AA);
      }
    },
  );

  /*
   * These four are used as *label* colours, not only as button fills.
   * `--destructive` names the Danger Zone's warnings; `--gold` sets the
   * attribution; `--primary` is a link colour in dark mode. Checking
   * them only as fills is what let `--gold` ship at 3.21:1.
   */
  it.each(["destructive", "gold", "success", "warning", "info"])(
    "%s is readable as text on background and card",
    (name) => {
      expect(contrast(t(name), t("background")), `--${name} on background`).toBeGreaterThanOrEqual(
        TEXT_AA,
      );
      expect(contrast(t(name), t("card")), `--${name} on card`).toBeGreaterThanOrEqual(TEXT_AA);
    },
  );

  it.each(["primary", "destructive", "success", "warning", "info", "gold"])(
    "%s-foreground is readable on its own fill",
    (name) => {
      expect(contrast(t(`${name}-foreground`), t(name))).toBeGreaterThanOrEqual(TEXT_AA);
    },
  );

  it.each(["success", "warning", "info"])("%s is readable on its own muted surface", (name) => {
    expect(contrast(t(name), t(`${name}-muted`))).toBeGreaterThanOrEqual(TEXT_AA);
  });

  /*
   * `--input` and `--border` are deliberately different values now.
   * 1.4.11 governs the boundary that identifies a *control*, which is
   * `--input`. `--border` mostly separates cards and sections, which the
   * rule does not cover — dragging it to 3:1 would draw every card edge
   * in hard lines and cost the calm the product exists for. It is held
   * to merely visible instead.
   */
  it("input borders meet the 3:1 needed to identify a control", () => {
    expect(contrast(t("input"), t("background"))).toBeGreaterThanOrEqual(CONTROL_AA);
    expect(contrast(t("input"), t("card"))).toBeGreaterThanOrEqual(CONTROL_AA);
  });

  it("decorative borders are at least visible", () => {
    expect(contrast(t("border"), t("background"))).toBeGreaterThanOrEqual(1.7);
    expect(contrast(t("border"), t("card"))).toBeGreaterThanOrEqual(1.7);
  });
});

describe("the palette is the only source of colour", () => {
  /*
   * Stock Tailwind palette entries are a different colour system —
   * cooler and more saturated than PHOS's warm sand and maroon. Twenty
   * component files used them, which is why a green tick from another
   * application sat on the onboarding screen.
   */
  it("no component reaches past the tokens for a stock Tailwind colour", async () => {
    const { globSync } = await import("node:fs");
    const files = [
      ...globSync("components/**/*.tsx", { cwd: ROOT }),
      ...globSync("app/**/*.tsx", { cwd: ROOT }),
    ];

    const banned =
      /\b(?:text|bg|border|ring|from|to|via)-(emerald|amber|rose|sky|green|red|blue|yellow|indigo|violet|teal|cyan|lime|orange|fuchsia|pink)-\d{2,3}\b/;
    const offenders: string[] = [];

    for (const file of files) {
      const source = readFileSync(join(ROOT, file), "utf8");
      source.split("\n").forEach((line, index) => {
        const hit = line.match(banned);
        if (hit) offenders.push(`${file}:${index + 1} — ${hit[0]}`);
      });
    }

    expect(offenders, `Use a semantic token instead:\n${offenders.join("\n")}`).toEqual([]);
  });
});
