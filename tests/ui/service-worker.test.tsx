import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

/**
 * `public/sw.js` had no tests at all, and PHOS now makes a strong claim
 * on its behalf — the guide, the onboarding wizard and the README all
 * say the app works with no internet connection.
 *
 * That claim was untrue for any URL without a trailing slash. The build
 * emits `session/index.html`, the precache holds `/session/`, and a
 * navigation to `/session` is a different cache key. Online the static
 * host redirects and nobody notices; offline it fell through to the
 * "you are offline" page on the URL a person is most likely to type.
 *
 * The worker is plain JavaScript outside both test runners, so it is
 * loaded here into a fake `ServiceWorkerGlobalScope` with a minimal
 * Cache implementation. That is enough to run its real install and
 * fetch handlers against real URLs.
 */

const ORIGIN = "https://example.github.io";
const SCOPE = `${ORIGIN}/PHOS/`;

interface FakeResponse {
  url: string;
  ok: boolean;
  type: string;
  clone: () => FakeResponse;
}

function response(url: string): FakeResponse {
  const body: FakeResponse = {
    url,
    ok: true,
    type: "basic",
    clone: () => body,
  };
  return body;
}

/** Just enough of the Cache API for the worker's own calls. */
class FakeCache {
  readonly entries = new Map<string, FakeResponse>();

  async put(request: string | { url: string }, value: FakeResponse) {
    this.entries.set(typeof request === "string" ? request : request.url, value);
  }

  async add(url: string) {
    this.entries.set(url, response(url));
  }

  async match(request: string | { url: string }, options?: { ignoreSearch?: boolean }) {
    const url = typeof request === "string" ? request : request.url;
    const direct = this.entries.get(url);
    if (direct) return direct;

    if (options?.ignoreSearch) {
      const withoutSearch = url.split("?")[0]!;
      for (const [key, value] of this.entries) {
        if (key.split("?")[0] === withoutSearch) return value;
      }
    }
    return undefined;
  }
}

type Handler = (event: Record<string, unknown>) => void;

/** Loads the real `public/sw.js` into a fake worker global. */
function loadWorker({ online }: { online: boolean }) {
  const handlers = new Map<string, Handler>();
  const caches = new Map<string, FakeCache>();

  const self: Record<string, unknown> = {
    // A real `WorkerLocation` stringifies to its href, which is what
    // `new URL("./", self.location)` in the worker relies on.
    location: {
      href: `${SCOPE}sw.js`,
      origin: ORIGIN,
      toString: () => `${SCOPE}sw.js`,
    },
    addEventListener: (type: string, handler: Handler) => handlers.set(type, handler),
    skipWaiting: () => Promise.resolve(),
    clients: { claim: () => Promise.resolve() },
  };

  const context = vm.createContext({
    self,
    URL,
    Response: { error: () => ({ url: "", ok: false, type: "error", isError: true }) },
    Promise,
    Math,
    Object,
    Array,
    console,
    fetch: (request: { url: string } | string) =>
      online
        ? Promise.resolve(response(typeof request === "string" ? request : request.url))
        : Promise.reject(new Error("offline")),
    caches: {
      open: async (name: string) => {
        if (!caches.has(name)) caches.set(name, new FakeCache());
        return caches.get(name)!;
      },
      keys: async () => [...caches.keys()],
      delete: async (name: string) => caches.delete(name),
      match: async (request: string | { url: string }) => {
        for (const cache of caches.values()) {
          const hit = await cache.match(request);
          if (hit) return hit;
        }
        return undefined;
      },
    },
  });

  const source = fs.readFileSync(path.join(process.cwd(), "public", "sw.js"), "utf-8");
  vm.runInContext(source, context);

  return {
    handlers,
    caches,
    async install() {
      let work: Promise<unknown> = Promise.resolve();
      handlers.get("install")?.({ waitUntil: (p: Promise<unknown>) => (work = p) });
      await work;
    },
    async navigate(url: string) {
      let answer: Promise<FakeResponse> = Promise.resolve(response(url));
      handlers.get("fetch")?.({
        request: { url, method: "GET", mode: "navigate" },
        respondWith: (p: Promise<FakeResponse>) => (answer = p),
      });
      return answer;
    },
  };
}

describe("installing", () => {
  it("precaches every route, so the first offline launch works", async () => {
    const worker = loadWorker({ online: true });
    await worker.install();

    const cached = [...worker.caches.values()][0]!.entries;

    for (const route of ["", "dashboard/", "session/", "revision/", "settings/", "about/"]) {
      expect(cached.has(`${SCOPE}${route}`)).toBe(true);
    }
    expect(cached.has(`${SCOPE}offline.html`)).toBe(true);
  });

  it("caches under the deployment's own path, not the origin root", async () => {
    // On GitHub Pages PHOS lives at /PHOS/. A hardcoded leading slash
    // would cache another project's URLs.
    const worker = loadWorker({ online: true });
    await worker.install();

    for (const key of [...worker.caches.values()][0]!.entries.keys()) {
      expect(key.startsWith(SCOPE)).toBe(true);
    }
  });
});

describe("navigating offline", () => {
  async function offlineWorker() {
    // Installed while online, then the network goes away — which is
    // what actually happens to a user.
    const online = loadWorker({ online: true });
    await online.install();
    const cached = [...online.caches.values()][0]!;

    const offline = loadWorker({ online: false });
    await offline.install();
    const target = [...offline.caches.values()][0]!;
    for (const [key, value] of cached.entries) target.entries.set(key, value);

    return offline;
  }

  it("serves the app for a canonical URL", async () => {
    const worker = await offlineWorker();

    const answer = await worker.navigate(`${SCOPE}session/`);

    expect(answer.url).toBe(`${SCOPE}session/`);
  });

  it("serves the app for a URL without its trailing slash", async () => {
    const worker = await offlineWorker();

    // The defect: `/session` is a different cache key from `/session/`.
    // Online the host redirects; offline nothing does, so this fell
    // through to the offline page on the most typable form of the URL.
    const answer = await worker.navigate(`${SCOPE}session`);

    expect(answer.url).toBe(`${SCOPE}session/`);
  });

  it("ignores a query string when matching", async () => {
    const worker = await offlineWorker();

    const answer = await worker.navigate(`${SCOPE}dashboard/?from=notification`);

    expect(answer.url).toBe(`${SCOPE}dashboard/`);
  });

  it("falls back to the offline page only for a route it has never seen", async () => {
    const worker = await offlineWorker();

    const answer = await worker.navigate(`${SCOPE}some/unknown/route/`);

    expect(answer.url).toBe(`${SCOPE}offline.html`);
  });
});

describe("navigating online", () => {
  it("prefers the network, so a fresh build is never masked by the cache", async () => {
    const worker = loadWorker({ online: true });
    await worker.install();

    const answer = await worker.navigate(`${SCOPE}dashboard/`);

    expect(answer.url).toBe(`${SCOPE}dashboard/`);
    expect(answer.ok).toBe(true);
  });
});
