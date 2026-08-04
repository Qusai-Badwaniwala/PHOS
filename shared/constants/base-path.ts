/**
 * The path PHOS is served from, or `""` when it is served from a domain
 * root.
 *
 * GitHub Pages hosts a project site at `https://user.github.io/PHOS/`,
 * so every URL PHOS writes by hand — the manifest's `start_url`, the
 * service worker's registration — has to carry that prefix. Next
 * rewrites the links it generates itself from `basePath`; this is the
 * same value, for the few places that are not Next's to rewrite.
 *
 * Set once, in `next.config.mjs`, from `PHOS_BASE_PATH`.
 */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/** Prefixes an absolute in-app path with `BASE_PATH`. */
export function withBasePath(path: string): string {
  return `${BASE_PATH}${path}`;
}
