"use client";

import React from "react";
import { HardDrive, ShieldCheck, ShieldAlert } from "lucide-react";
import { ContentCard } from "@/components/shared/content-card";
import { readStorageReport, type StorageReport } from "@/client/storage";

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Where the user's Hifz record actually is, and how safe it is there.
 *
 * This card exists because PHOS asks people to trust it with years of
 * work while storing that work somewhere most of them have never
 * thought about. The Backup page is where they are already thinking
 * about losing data, so it is where the honest answer belongs — not
 * buried in a guide.
 *
 * It states the limitation before offering the remedy. A user who reads
 * "clearing your browser data erases this" and immediately sees the
 * export button two cards below has been given something they can act
 * on; one who reads only "your data is private and stays on your
 * device" has been given a half-truth.
 */
export function StorageNotice() {
  const [report, setReport] = React.useState<StorageReport | null>(null);

  React.useEffect(() => {
    let active = true;
    void readStorageReport().then((result) => {
      if (active) setReport(result);
    });
    return () => {
      active = false;
    };
  }, []);

  const persistent = report?.persistence === "persistent";

  return (
    <ContentCard as="section">
      <div className="flex gap-3">
        <HardDrive className="text-muted-foreground mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <h2 className="text-sm font-medium">Where your progress is kept</h2>
            <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
              Everything PHOS knows about your Hifz is stored in this browser, on this device. It is
              never sent anywhere, and no account exists that could reach it — which also means
              clearing this site&apos;s browser data would erase it and any other apps sharing the
              same website address. Use Reset PHOS in Settings to start only PHOS fresh. An exported
              file kept elsewhere is the copy that survives browser clearing.
            </p>
          </div>

          {report && report.persistence !== "unsupported" && (
            <div className="flex items-start gap-2 text-sm">
              {persistent ? (
                <ShieldCheck className="text-success mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              ) : (
                <ShieldAlert className="text-gold mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              )}
              <p className="text-muted-foreground">
                {persistent
                  ? "Persistent storage is enabled for this site. This protects against automatic eviction, but not clearing site data yourself."
                  : "Your browser may clear this site's data if it runs short of space. Installing PHOS may help it grant persistent storage. Keep an exported file either way."}
                {report.usageBytes !== null && (
                  <span className="block">
                    Shared site storage: about {formatBytes(report.usageBytes)}, including any other
                    apps on this address.
                  </span>
                )}
              </p>
            </div>
          )}
        </div>
      </div>
    </ContentCard>
  );
}
