import type { MetadataRoute } from "next";
import { withBasePath } from "@/shared/constants";

/**
 * The PWA manifest, so PHOS can be installed and launched from the home
 * screen or desktop in its own window.
 *
 * Icons are generated from the PHOS logo by `npm run icons` and
 * committed under `public/icons/`, so a normal build never needs the
 * image tooling.
 *
 * The `maskable` variants exist because Android may crop an icon to a
 * circle or squircle; they carry the logo inset inside the guaranteed
 * safe zone. The `any` variants fill the frame and are used where no
 * cropping happens.
 *
 * Every path here goes through `withBasePath()`. Next rewrites the URLs
 * it generates, but not the strings inside this object — and a manifest
 * whose `start_url` points outside the deployment is a manifest the
 * browser refuses to install.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PHOS — Personal Hifz Operating System",
    short_name: "PHOS",
    description:
      "A calm, structured companion for memorizing the Quran. Your data stays on your own device.",
    start_url: withBasePath("/dashboard/"),
    // Confines the installed app to PHOS's own deployment, which is what
    // makes a link outside it open in the browser rather than inside the
    // installed window.
    scope: withBasePath("/"),
    display: "standalone",
    orientation: "portrait",
    // The logo's own cream, so the splash screen and icon padding match
    // rather than framing the logo in white.
    background_color: "#F5F1EB",
    // The maroon primary from the PHOS palette (356 32% 33%).
    theme_color: "#72383D",
    categories: ["education", "lifestyle"],
    icons: [
      {
        src: withBasePath("/icons/icon-192.png"),
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: withBasePath("/icons/icon-512.png"),
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: withBasePath("/icons/icon-maskable-192.png"),
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: withBasePath("/icons/icon-maskable-512.png"),
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
