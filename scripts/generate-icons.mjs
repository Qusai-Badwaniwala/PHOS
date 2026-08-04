import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Generates the PWA icon set from the PHOS logo.
 *
 * Run with `npm run icons`. The output is committed under
 * `public/icons/`, so building and deploying PHOS never needs `sharp`.
 *
 * WHY SHARP IS NOT A DEPENDENCY
 * -----------------------------
 * It used to be a devDependency, and it broke CI. `sharp` ships
 * per-platform native binaries; the lockfile generated on Windows
 * omitted `@emnapi/core` and `@emnapi/runtime`, which npm only reaches
 * through `@img/sharp-wasm32`. `npm ci` then failed on Linux with
 * "Missing: @emnapi/runtime from lock file" — a known npm
 * optional-dependency bug (npm/cli#4828).
 *
 * Rather than fight the lockfile, the dependency is gone: every install
 * in CI was pulling a native image library to build a set of icons that
 * were already committed. It is now installed on demand, by the one
 * person regenerating icons, on the rare occasion the logo changes.
 *
 *     npm install --no-save sharp && npm run icons
 *
 * Two families are produced, because they are used differently:
 *
 * - **any** icons are shown as-is (browser tab, install prompt), so the
 *   logo fills the frame.
 * - **maskable** icons may be cropped to a circle, squircle or rounded
 *   square by the platform. The spec guarantees only the central 80%
 *   ("safe zone") survives, so the logo is inset and the surrounding
 *   area filled with the logo's own cream, letting any mask shape cut
 *   cleanly without clipping the arch or the wordmark.
 */

/**
 * Loaded on demand so this file can be read, linted and formatted
 * without `sharp` installed — and so someone running it without the
 * dependency gets an instruction rather than a module-resolution stack
 * trace.
 */
async function loadSharp() {
  try {
    return (await import("sharp")).default;
  } catch {
    console.error(
      "This script needs `sharp`, which is deliberately not a project dependency.\n" +
        "Install it just for this run:\n\n" +
        "    npm install --no-save sharp && npm run icons\n",
    );
    process.exit(1);
  }
}

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.join(HERE, "..");
const SOURCE = path.join(PROJECT_ROOT, "public", "PHOS app logo.png");
const OUTPUT_DIR = path.join(PROJECT_ROOT, "public", "icons");

/** The logo's cream ground, sampled from the source. Also the manifest background. */
const CREAM = { r: 245, g: 241, b: 235 };

/** Fraction of a maskable icon the logo occupies, per the 80% safe-zone rule. */
const SAFE_ZONE_RATIO = 0.8;

const ANY_SIZES = [192, 512];
const MASKABLE_SIZES = [192, 512];
const APPLE_TOUCH_SIZE = 180;
const FAVICON_SIZES = [32, 16];

async function main() {
  const sharp = await loadSharp();

  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  const source = await fs.readFile(SOURCE);
  const background = { r: CREAM.r, g: CREAM.g, b: CREAM.b, alpha: 1 };

  for (const size of ANY_SIZES) {
    await sharp(source)
      .resize(size, size, { fit: "contain", background })
      .png()
      .toFile(path.join(OUTPUT_DIR, `icon-${size}.png`));
  }

  for (const size of MASKABLE_SIZES) {
    const inner = Math.round(size * SAFE_ZONE_RATIO);
    const padding = Math.round((size - inner) / 2);

    const logo = await sharp(source)
      .resize(inner, inner, { fit: "contain", background })
      .toBuffer();

    await sharp({
      create: { width: size, height: size, channels: 4, background },
    })
      .composite([{ input: logo, top: padding, left: padding }])
      .png()
      .toFile(path.join(OUTPUT_DIR, `icon-maskable-${size}.png`));
  }

  await sharp(source)
    .resize(APPLE_TOUCH_SIZE, APPLE_TOUCH_SIZE, { fit: "contain", background })
    .flatten({ background })
    .png()
    .toFile(path.join(PROJECT_ROOT, "public", "apple-touch-icon.png"));

  for (const size of FAVICON_SIZES) {
    await sharp(source)
      .resize(size, size, { fit: "contain", background })
      .png()
      .toFile(path.join(PROJECT_ROOT, "public", `favicon-${size}x${size}.png`));
  }

  const written = await fs.readdir(OUTPUT_DIR);
  console.log(`Wrote ${written.length} icons to public/icons/ plus apple-touch-icon and favicons.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
