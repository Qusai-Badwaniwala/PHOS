import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
const root = path.resolve("out");
async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const results = await Promise.all(
    entries.map((entry) =>
      entry.isDirectory()
        ? walk(path.join(directory, entry.name))
        : [path.join(directory, entry.name)],
    ),
  );
  return results.flat();
}
const files = (await walk(root))
  .filter((file) => !["sw.js", "precache-manifest.js"].includes(path.basename(file)))
  .sort();
const digest = createHash("sha256");
// A worker-policy change must install into a different cache too. Otherwise
// a failed reinstall could remove the currently active build's cache.
digest.update("sw.js");
digest.update(await readFile(path.join(root, "sw.js")));
const urls = [];
let bytes = 0;
for (const file of files) {
  const relative = path.relative(root, file).split(path.sep).join("/");
  const contents = await readFile(file);
  digest.update(relative);
  digest.update(contents);
  bytes += contents.length;
  urls.push(relative.endsWith("index.html") ? relative.slice(0, -10) || "./" : relative);
}
const manifest = { version: digest.digest("hex").slice(0, 20), urls: [...new Set(urls)], bytes };
await writeFile(
  path.join(root, "precache-manifest.js"),
  `self.PHOS_PRECACHE=${JSON.stringify(manifest)};\n`,
);
console.log(
  `Offline record: ${manifest.urls.length} assets, ${(bytes / 1024 / 1024).toFixed(2)} MiB, build ${manifest.version}`,
);
