/* Every production route and asset belongs to one complete, scoped build.
 * No update can replace an open study without the user's explicit action. */
importScripts(new URL("precache-manifest.js", self.location).href);
const SCOPE = new URL("./", self.location).href;
const PREFIX = `phos-folio:${encodeURIComponent(new URL(SCOPE).pathname)}:`;
const CACHE = PREFIX + self.PHOS_PRECACHE.version;
const scoped = (path) => new URL(path, SCOPE).href;
const normalize = (raw) => {
  const url = new URL(raw);
  url.search = "";
  url.hash = "";
  return url.href;
};
self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      try {
        const resources = self.PHOS_PRECACHE.urls.map(scoped);
        const expected = new Set(resources);
        // Stable route URLs may still have HTML from a previous release in HTTP cache.
        await cache.addAll(resources.map((url) => new Request(url, { cache: "reload" })));
        // A stale hosting response must not turn a new build into an unusable offline app.
        for (const path of self.PHOS_PRECACHE.urls) {
          if (!path.endsWith("/") && !path.endsWith(".html")) continue;
          const response = await cache.match(scoped(path));
          if (!response) throw new Error("The complete PHOS page was not saved.");
          const html = await response.text();
          for (const match of html.matchAll(
            /(?:src|href)=["']([^"']*\/_next\/static\/[^"']+)["']/g,
          )) {
            const asset = normalize(new URL(match[1], SCOPE).href);
            if (!expected.has(asset)) throw new Error("A PHOS page belongs to another build.");
          }
        }
      } catch (error) {
        await caches.delete(CACHE);
        throw error;
      }
    })(),
  );
});
self.addEventListener("message", (event) => {
  if (event.data?.type === "PHOS_APPLY_UPDATE") event.waitUntil(self.skipWaiting());
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const older = (await caches.keys()).filter((key) => key.startsWith(PREFIX) && key !== CACHE);
      const obsolete = older.slice(0, -1);
      await Promise.all(obsolete.map((key) => caches.delete(key)));
      await self.clients.claim();
    })(),
  );
});
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (
    request.method !== "GET" ||
    url.origin !== self.location.origin ||
    !url.href.startsWith(SCOPE)
  )
    return;
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      const clean = normalize(request.url);
      const hit = await cache.match(clean);
      if (hit) return hit;
      if (request.mode === "navigate" && !url.pathname.endsWith("/")) {
        const slash = await cache.match(normalize(`${url.origin}${url.pathname}/`));
        if (slash) return slash;
      }
      // An older open tab may still need its exact content-hashed assets.
      if (url.pathname.includes("/_next/static/")) {
        for (const key of await caches.keys()) {
          if (!key.startsWith(PREFIX) || key === CACHE) continue;
          const old = await (await caches.open(key)).match(clean);
          if (old) return old;
        }
      }
      try {
        const response = await fetch(request);
        if (response.ok && response.type === "basic" && url.pathname.includes("/_next/static/"))
          await cache.put(clean, response.clone());
        return response;
      } catch {
        if (request.mode === "navigate") return Response.redirect(scoped("offline.html"));
        return Response.error();
      }
    })(),
  );
});
