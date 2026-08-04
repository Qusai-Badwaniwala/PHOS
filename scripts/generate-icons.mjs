import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

/**
 * Generates the PWA icon set from the PHOS logo.
 *
 * Run with `npm run icons`. Committed output lives in `public/icons/`,
 * so a normal build and deploy never needs `sharp` — it is a
 * devDependency used by this script alone.
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
