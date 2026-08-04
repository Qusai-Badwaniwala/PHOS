/**
 * PHOS builds to a folder of static files.
 *
 * WHY
 * ---
 * PHOS is a single-user application whose data belongs to one person on
 * one device. A server never held anything that person needed — it only
 * added something to host, something to trust, and an installation step
 * ("install Node, run npm") that put the app out of reach of the people
 * it is for. Since Phase 9 the five engines run in the browser against
 * IndexedDB, so there is nothing left for a server to do.
 *
 * What this makes possible is the whole point: a link anyone can open,
 * install as an app, and use offline, with their Hifz record staying on
 * their own device.
 *
 * HISTORY, SO THIS IS NOT REVERTED BY MISTAKE
 * -------------------------------------------
 * The uploaded frontend originally set `output: "export"`. It was
 * removed during integration because static export cannot serve
 * `app/api/**` Route Handlers, and keeping it would have silently
 * discarded the entire backend at build time. That reasoning was
 * correct then. It no longer applies: `app/api/**` is gone, deliberately
 * and completely, and nothing in the application calls a URL.
 */

/**
 * GitHub Pages serves a project site from `/<repository>/`, so every
 * URL the app emits needs that prefix. Supplied by the deploy workflow
 * rather than hardcoded, so the same source builds correctly at a
 * domain root too (a custom domain, or `npm run preview`) with the
 * variable unset.
 */
const basePath = process.env.PHOS_BASE_PATH ?? "";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  output: "export",

  basePath,
  assetPrefix: basePath,

  /**
   * The same value, readable from application code. Declared here so
   * one variable drives both the framework's URL handling and the
   * handful of paths PHOS writes itself (the manifest, the service
   * worker registration) — two variables that had to agree would
   * eventually not.
   */
  env: { NEXT_PUBLIC_BASE_PATH: basePath },

  /**
   * Emits `about/index.html` rather than `about.html`, which is what a
   * static host resolves `/about` to without any rewrite rules of its
   * own. Without this, every route but the home page 404s on GitHub
   * Pages.
   */
  trailingSlash: true,

  images: {
    // Next's image optimizer needs a server. There is none, and PHOS
    // uses no remote images anyway.
    unoptimized: true,
  },
};

export default nextConfig;
