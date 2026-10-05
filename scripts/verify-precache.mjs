import { readFile, access } from "node:fs/promises";
import path from "node:path";
const source = await readFile("out/precache-manifest.js", "utf8");
const manifest = JSON.parse(
  source
    .slice(source.indexOf("=") + 1)
    .trim()
    .replace(/;$/, ""),
);
for (const route of [
  "./",
  "dashboard/",
  "session/",
  "revision/",
  "analytics/",
  "history/",
  "exams/",
  "more/",
  "settings/",
  "backup/",
  "about/",
  "offline.html",
  "manifest.webmanifest",
])
  if (!manifest.urls.includes(route)) throw new Error(`Offline route missing: ${route}`);
if (
  !manifest.urls.some((url) => url.endsWith(".woff2")) ||
  !manifest.urls.some((url) => url.endsWith(".js")) ||
  !manifest.urls.some((url) => url.endsWith(".css"))
)
  throw new Error("Offline fonts or bundles missing");
for (const url of manifest.urls)
  await access(
    path.join("out", url === "./" ? "index.html" : url.endsWith("/") ? url + "index.html" : url),
  );
console.log(`Verified ${manifest.urls.length} offline resources and all meaningful routes.`);
