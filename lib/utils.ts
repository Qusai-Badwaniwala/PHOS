import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Whether a navigation entry points at the page currently open.
 *
 * Exists because comparing the two directly is wrong here, and was
 * wrong in the shipped build for every route.
 *
 * `next.config.mjs` sets `trailingSlash: true` — PHOS is a static
 * export, and directory-style URLs are what make an offline route
 * resolve to its own `index.html`. So `usePathname()` returns
 * `"/settings/"` while the navigation arrays hold `"/settings"`, and
 * `pathname === item.href` is false on every page of the application.
 * Nothing was ever highlighted, and because the same expression drives
 * `aria-current`, a screen reader was never told where it was either.
 *
 * A silent always-false is exactly the kind of defect a screenshot
 * hides: the navigation still worked, so nothing looked broken enough
 * to investigate. `tests/ui/navigation-active.test.tsx` asserts the
 * trailing-slash form specifically.
 */
export function isCurrentPath(pathname: string | null, href: string): boolean {
  const normalize = (value: string) => value.replace(/\/+$/, "") || "/";
  return pathname !== null && normalize(pathname) === normalize(href);
}
