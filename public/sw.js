/*
 * PHOS service worker.
 *
 * WHAT CHANGED IN PHASE 9
 * -----------------------
 * This file used to open with a careful disclaimer: PHOS kept its data
 * in a SQLite database behind a local Node.js server, so caching the
 * shell made the interface load fast but could not make the app usable
 * — "no cache can invent" a study plan that only the server could
 * compute.
 *
 * That is no longer true. The five engines and the database now run in
 * the browser, so a cached shell is the whole application. PHOS works
 * with no network at all: not "loads quickly on a bad connection", but
 * genuinely works — plan a day, record a session, take a backup, on a
 * plane.
 *
 * The claim is therefore now the strong one, and it is honest.
 *
 * SCOPE AND PATHS
 * ---------------
 * Every path is resolved relative to `self.location`, never written as
 * an absolute `/…`. PHOS may be served from a domain root or from
 * `/PHOS/` on GitHub Pages, and a hardcoded leading slash would silently
 * cache the wrong origin path in the second case.
 */

const CACHE_VERSION = "phos-v3";

/** `…/` — where this worker's scope begins, root or subdirectory alike. */
const SCOPE = new URL("./", self.location).href;

const asScoped = (path) => new URL(path, SCOPE).href;

/**
 * The cache keys worth trying for a navigation, in order.
 *
 * PHOS builds with `trailingSlash: true`, so every route is emitted as
 * `session/index.html` and its canonical URL is `/session/`. That is
 * what the precache holds.
 *
 * A user reaching `/session` — from a bookmark, a typed address, or a
 * link written before the trailing slash existed — asks for a *different
 * cache key*. Online this is invisible, because the static host answers
 * with a 301 to the canonical URL. Offline there is no host to redirect,
 * so the lookup missed, the offline page was served instead of the app,
 * and PHOS looked broken on exactly the URL a person is most likely to
 * type.
 *
 * Found by the product owner testing the offline claim with DevTools,
 * on `/session` rather than `/session/`.
 */
function navigationCandidates(rawUrl) {
  const url = new URL(rawUrl);
  const candidates = [url.href];

  if (!url.pathname.endsWith("/")) {
    // The redirect the server would have issued, applied locally.
    candidates.push(new URL(`${url.pathname}/${url.search}`, url.origin).href);
  }

  return candidates;
}

/**
 * Precached at install, so the very first offline launch works rather
 * than only the second.
 *
 * Every route is listed because each is its own HTML file under static
 * export, and a user who installs PHOS and immediately goes offline
 * should not find that only the page they happened to open first is
 * available. The list is short and fixed — PHOS has eight screens.
 */
const PRECACHE_URLS = [
  "./",
  "dashboard/",
  "session/",
  "revision/",
  "analytics/",
  "history/",
  "backup/",
  "settings/",
  "about/",
  "offline.html",
  "manifest.webmanifest",
  "icons/icon-192.png",
].map(asScoped);

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      // Added individually rather than with `addAll`, which rejects the
      // whole install if any single URL 404s. A missing icon should not
      // cost the user offline access to their Hifz record.
      .then((cache) =>
        Promise.all(PRECACHE_URLS.map((url) => cache.add(url).catch(() => undefined))),
      )
      // Take over as soon as installed rather than waiting for every tab
      // to close; PHOS is single-user and there is no other client to
      // coordinate with.
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Same-origin only: PHOS makes no cross-origin requests, and caching
  // one would be a surprise.
  if (url.origin !== self.location.origin) return;

  /*
   * Navigations: network first, cache second.
   *
   * Network first so a user who is online always gets the current build
   * rather than yesterday's shell. Cache second so a user who is offline
   * gets the real application rather than an apology page — which is the
   * change Phase 9 earned, since the application no longer needs
   * anything the network was providing.
   *
   * `offline.html` survives only as the last resort for a route that was
   * never visited and never precached.
   */
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          void caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(async () => {
          const cache = await caches.open(CACHE_VERSION);

          for (const candidate of navigationCandidates(request.url)) {
            const hit = await cache.match(candidate, { ignoreSearch: true });
            if (hit) return hit;
          }

          return (await cache.match(asScoped("offline.html"))) ?? Response.error();
        }),
    );
    return;
  }

  // Everything else — Next's content-hashed build assets, icons, the
  // manifest. A cache hit on a hashed asset is always the right answer
  // and can never go stale, because a changed file has a changed name.
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;

      return fetch(request).then((response) => {
        if (response.ok && response.type === "basic") {
          const copy = response.clone();
          void caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
        }
        return response;
      });
    }),
  );
});
