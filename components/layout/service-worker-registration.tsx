"use client";

import { useEffect } from "react";
import { withBasePath } from "@/shared/constants";

/**
 * Registers the PHOS service worker.
 *
 * Kept in its own client component so `app/layout.tsx` stays a server
 * component — mounting this is the only client-side work the root
 * layout needs, and turning the whole layout into a client component to
 * get it would push every page's shell into the client bundle.
 *
 * Registration is deliberately silent about failure. A browser that
 * refuses service workers (private windows, certain enterprise
 * policies) still runs PHOS — it just loses the install prompt and
 * offline use, neither of which is worth an error message.
 *
 * Skipped in development, where an aggressive cache mostly serves to
 * hide the change you just made.
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    const register = () => {
      // Registered at PHOS's own base path, so its scope covers the
      // deployment and no more. On GitHub Pages that is `/PHOS/`, not
      // the whole `user.github.io` origin — a worker registered at the
      // root would try to control every other project hosted there.
      void navigator.serviceWorker
        .register(withBasePath("/sw.js"), { scope: withBasePath("/") })
        .catch(() => undefined);
    };

    // Registered after load so it never competes with the first paint
    // for bandwidth or main-thread time.
    if (document.readyState === "complete") {
      register();
      return;
    }

    window.addEventListener("load", register, { once: true });
    return () => window.removeEventListener("load", register);
  }, []);

  return null;
}
