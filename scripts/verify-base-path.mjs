import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Fails the build if anything in `out/` points at the domain root when
 * PHOS is deployed under a sub-path.
 *
 * WHY THIS EXISTS
 * ---------------
 * Next rewrites the URLs it generates itself — `next/link`, route
 * hrefs, `_next/` assets — but not strings the application writes by
 * hand. On the first deploy that left four URLs pointing at
 * `qusai-badwaniwala.github.io/` instead of `.../PHOS/`:
 *
 *   - the About page's logo, which rendered as a broken image
 *   - both favicons and the apple-touch-icon
 *   - `<link rel="manifest">`, without which a browser will not offer
 *     to install PHOS as an app at all
 *
 * Every one of them 404'd silently. The build was green, all 416 tests
 * passed, and it was found by looking at a phone screen.
 *
 * A unit test cannot catch this, because the mistake only exists after
 * a build with a base path set. So the check runs against the artifact
 * that is about to be published.
 */

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, "..", "out");
const BASE_PATH = process.env.PHOS_BASE_PATH ?? "";

/**
 * Absolute URLs that are legitimately not ours to prefix: other
 * origins, data URIs, and in-page anchors.
 */
const IGNORED = /^(https?:|data:|mailto:|#|\/\/)/;

async function htmlFiles(dir) {
  const found = [];
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) found.push(...(await htmlFiles(full)));
    else if (entry.name.endsWith(".html")) found.push(full);
  }
  return found;
}

async function main() {
  if (!BASE_PATH) {
    console.log("verify-base-path: PHOS_BASE_PATH is empty; nothing to check.");
    return;
  }

  const files = await htmlFiles(OUT);
  const problems = [];

  for (const file of files) {
    const html = await fs.readFile(file, "utf-8");
    for (const match of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
      const url = match[1];
      if (IGNORED.test(url)) continue;
      // Only absolute in-site paths can be wrong; relative ones resolve
      // against the page and are always correct.
      if (!url.startsWith("/")) continue;
      if (url.startsWith(`${BASE_PATH}/`)) continue;

      problems.push(`  ${path.relative(OUT, file)} -> ${url}`);
    }
  }

  if (problems.length > 0) {
    console.error(
      `verify-base-path: ${problems.length} URL(s) point at the domain root ` +
        `instead of "${BASE_PATH}". They will 404 once deployed:\n` +
        [...new Set(problems)].join("\n") +
        `\n\nWrap them in withBasePath() from "@/shared/constants", or make ` +
        `them relative if the file is copied verbatim from public/.`,
    );
    process.exit(1);
  }

  console.log(
    `verify-base-path: checked ${files.length} page(s); every in-site URL carries "${BASE_PATH}".`,
  );
}

await main();
