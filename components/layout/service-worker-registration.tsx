"use client";
import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { withBasePath } from "@/shared/constants";
import { fetchActiveSession } from "@/lib/api/activeSession";
import { Button } from "@/components/ui/button";
export function ServiceWorkerRegistration() {
  const path = usePathname();
  const [waiting, setWaiting] = React.useState<ServiceWorker | null>(null);
  const [failure, setFailure] = React.useState(false);
  const [blocked, setBlocked] = React.useState<string | null>(null);
  const [applying, setApplying] = React.useState(false);
  const [attempt, setAttempt] = React.useState(0);
  const requested = React.useRef(false);
  React.useEffect(() => {
    setBlocked(null);
  }, [path]);
  React.useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    let disposed = false;
    let registration: ServiceWorkerRegistration | undefined;
    const changed = () => {
      if (requested.current) window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", changed);
    const register = async () => {
      try {
        registration = await navigator.serviceWorker.register(withBasePath("/sw.js"), {
          scope: withBasePath("/"),
          updateViaCache: "none",
        });
        if (disposed) return;
        setFailure(false);
        if (registration.waiting) setWaiting(registration.waiting);
        registration.addEventListener("updatefound", () => {
          const worker = registration?.installing;
          if (!worker) return;
          let installed = false;
          worker.addEventListener("statechange", () => {
            if (disposed) return;
            if (worker.state === "installed") {
              installed = true;
              setFailure(false);
              if (navigator.serviceWorker.controller) setWaiting(worker);
            }
            // A newer release can normally replace an installed waiting worker.
            // Only an installation that never completed is a setup failure.
            if (worker.state === "redundant" && !installed && !registration?.installing)
              setFailure(true);
          });
        });
      } catch {
        if (!disposed) setFailure(true);
      }
    };
    if (document.readyState === "complete") void register();
    else window.addEventListener("load", register, { once: true });
    const check = () => {
      if (document.visibilityState !== "visible" || !registration) return;
      if (registration.waiting) setWaiting(registration.waiting);
      void registration.update().catch(() => undefined);
    };
    document.addEventListener("visibilitychange", check);
    window.addEventListener("online", check);
    const interval = window.setInterval(check, 10 * 60 * 1000);
    return () => {
      disposed = true;
      window.removeEventListener("load", register);
      document.removeEventListener("visibilitychange", check);
      window.removeEventListener("online", check);
      window.clearInterval(interval);
      navigator.serviceWorker.removeEventListener("controllerchange", changed);
    };
  }, [attempt]);
  const apply = async () => {
    if (!waiting || applying) return;
    try {
      const active = await fetchActiveSession();
      if (active) {
        setBlocked(active.sessionType === "Sabaq" ? "/session" : "/revision");
        return;
      }
      setApplying(true);
      requested.current = true;
      waiting.postMessage({ type: "PHOS_APPLY_UPDATE" });
    } catch {
      setFailure(true);
    }
  };
  if (!waiting && !failure) return null;
  return (
    <aside
      aria-label="PHOS update"
      className="bg-card fixed top-[72px] right-4 left-4 z-40 max-w-xl rounded-xl border p-4 shadow-lg md:left-[228px]"
      role="status"
    >
      <p className="text-sm font-semibold">
        {waiting ? "A new PHOS is ready" : "Offline setup needs another try"}
      </p>
      <p className="text-muted-foreground mt-1 text-sm">
        {blocked
          ? "Finish your open study before applying this update. Your record remains saved."
          : waiting
            ? "Apply it when you are ready. Your local record stays on this device."
            : "PHOS is usable now. Keep a connection until its offline files are saved."}
      </p>
      <div className="mt-3 flex gap-2">
        {waiting ? (
          <>
            <Button size="sm" disabled={applying} onClick={() => void apply()}>
              {applying ? "Updating…" : "Apply update"}
            </Button>
            {blocked && (
              <Button asChild variant="outline" size="sm">
                <Link href={blocked}>Resume study</Link>
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => setWaiting(null)}>
              Later
            </Button>
          </>
        ) : (
          <>
            <Button variant="outline" size="sm" onClick={() => setAttempt((value) => value + 1)}>
              Retry offline setup
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setFailure(false)}>
              Close
            </Button>
          </>
        )}
      </div>
    </aside>
  );
}
