/** Executable worker policy: scoped complete installation and stable builds. */
import { readFileSync } from "node:fs";
import vm from "node:vm";
const source = readFileSync("public/sw.js", "utf8");
function worker(scope = "https://example.test/PHOS/sw.js") {
  const handlers: Record<string, (event: Record<string, unknown>) => void> = {};
  const records = new Map<string, Map<string, unknown>>();
  const deleted: string[] = [];
  const installed: string[][] = [];
  const self = {
    location: new URL(scope),
    PHOS_PRECACHE: {
      version: "new",
      urls: [
        "./",
        "dashboard/",
        "exams/",
        "more/",
        "session/",
        "_next/static/app.js",
        "_next/static/font.woff2",
      ],
    },
    addEventListener: (type: string, handler: (event: Record<string, unknown>) => void) => {
      handlers[type] = handler;
    },
    skipWaiting: jest.fn().mockResolvedValue(undefined),
    clients: { claim: jest.fn().mockResolvedValue(undefined) },
  };
  const caches = {
    open: async (name: string) => {
      if (!records.has(name)) records.set(name, new Map());
      const store = records.get(name)!;
      return {
        addAll: async (urls: string[]) => {
          installed.push(urls);
          for (const url of urls) store.set(url, { cached: url });
        },
        match: async (url: string) => store.get(url),
        put: async (url: string, value: unknown) => {
          store.set(url, value);
        },
      };
    },
    keys: async () => [...records.keys()],
    delete: async (name: string) => {
      deleted.push(name);
      return records.delete(name);
    },
  };
  const network = jest.fn().mockRejectedValue(new Error("offline"));
  vm.runInNewContext(source, {
    self,
    caches,
    fetch: network,
    URL,
    importScripts: () => undefined,
    Response: { redirect: (url: string) => ({ redirect: url }), error: () => ({ error: true }) },
  });
  async function lifecycle(type: string, data?: unknown) {
    let result: Promise<unknown> | undefined;
    handlers[type]!({
      data,
      waitUntil: (promise: Promise<unknown>) => {
        result = promise;
      },
    });
    await result;
  }
  async function request(url: string, mode = "navigate") {
    let result: Promise<unknown> | undefined;
    handlers.fetch!({
      request: { url, mode, method: "GET" },
      respondWith: (promise: Promise<unknown>) => {
        result = promise;
      },
    });
    return result;
  }
  return { self, caches, records, deleted, installed, network, lifecycle, request };
}
it("installs all manifest resources at the deployment scope without taking over", async () => {
  const w = worker();
  await w.lifecycle("install");
  expect(w.installed[0]).toContain("https://example.test/PHOS/exams/");
  expect(w.installed[0]).toContain("https://example.test/PHOS/more/");
  expect(w.installed[0]).toContain("https://example.test/PHOS/_next/static/font.woff2");
  expect(w.self.skipWaiting).not.toHaveBeenCalled();
});

it("removes an incomplete build when any precache resource fails", async () => {
  const w = worker();
  const open = w.caches.open;
  w.caches.open = async (name: string) => {
    const cache = await open(name);
    cache.addAll = async () => {
      throw new Error("asset download failed");
    };
    return cache;
  };
  await expect(w.lifecycle("install")).rejects.toThrow("asset download failed");
  expect(w.records.size).toBe(0);
  expect(w.self.skipWaiting).not.toHaveBeenCalled();
});
it.each([
  "https://example.test/PHOS/dashboard/",
  "https://example.test/PHOS/dashboard",
  "https://example.test/PHOS/dashboard/?record=1",
])("serves a complete cached build offline at %s", async (url) => {
  const w = worker();
  await w.lifecycle("install");
  expect(await w.request(url)).toEqual({ cached: "https://example.test/PHOS/dashboard/" });
});
it("keeps the cached HTML stable while a new network build is waiting", async () => {
  const w = worker();
  await w.lifecycle("install");
  w.network.mockResolvedValue({ fresh: true });
  expect(await w.request("https://example.test/PHOS/dashboard/")).toEqual({
    cached: "https://example.test/PHOS/dashboard/",
  });
  expect(w.network).not.toHaveBeenCalled();
});
it("redirects unknown offline paths to the correctly scoped fallback", async () => {
  const w = worker();
  await w.lifecycle("install");
  expect(await w.request("https://example.test/PHOS/unknown/")).toEqual({
    redirect: "https://example.test/PHOS/offline.html",
  });
});
it("deletes only its own obsolete builds and retains the preceding build for open tabs", async () => {
  const w = worker();
  w.records.set("another-app", new Map());
  const prefix = "phos-folio:%2FPHOS%2F:";
  w.records.set(prefix + "oldest", new Map());
  w.records.set(prefix + "previous", new Map());
  await w.lifecycle("install");
  await w.lifecycle("activate");
  expect(w.deleted).toEqual([prefix + "oldest"]);
  expect(w.records.has("another-app")).toBe(true);
  expect(w.records.has(prefix + "previous")).toBe(true);
});
it("takes over only after an explicit apply-update message", async () => {
  const w = worker();
  await w.lifecycle("message", { type: "unknown" });
  expect(w.self.skipWaiting).not.toHaveBeenCalled();
  await w.lifecycle("message", { type: "PHOS_APPLY_UPDATE" });
  expect(w.self.skipWaiting).toHaveBeenCalledTimes(1);
});
