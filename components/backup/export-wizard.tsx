"use client";

import { cn } from "@/lib/utils";
import React from "react";
import { ContentCard } from "@/components/shared/content-card";
import { Button } from "@/components/ui/button";
import { downloadJson, exportData, markExported } from "@/lib/api/backup";
import { Download, FileDown } from "lucide-react";

interface ExportWizardProps {
  /**
   * Refreshes the page after a successful export.
   *
   * Exporting now changes what the screen should say — the
   * "never exported" alert and the "Last exported file" row both read
   * `lastExportedAt` — so without this the user exports, is told it
   * worked, and goes on being warned that they never have.
   */
  onExported?: () => void;
  className?: string;
}

export function ExportWizard({ onExported, className }: ExportWizardProps) {
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [outcome, setOutcome] = React.useState<string | null>(null);

  const handleExport = async () => {
    setPending(true);
    setError(null);
    setOutcome(null);
    try {
      const result = await exportData();
      downloadJson(result.filename, result.content);
      // Recorded only once the file has actually been handed over.
      await markExported();
      setOutcome(`Exported to ${result.filename}.`);
      onExported?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to export data.");
    } finally {
      setPending(false);
    }
  };

  return (
    <ContentCard className={cn(className)}>
      <div className="mb-4 flex items-center gap-2">
        <FileDown className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
        <h3 className="font-semibold">Export</h3>
      </div>

      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Save a readable copy of your data as a file you keep. This is the only copy that survives
          clearing your browser, and the way to move PHOS to another device.
        </p>

        <div className="rounded-md bg-muted p-3">
          <p className="text-xs text-muted-foreground">
            Export includes: page progress, sessions, recall history, and settings.
          </p>
        </div>

        {/*
          The page's primary action, not an outline button.

          Export and "Create Backup" were presented as peers, and they
          are not: a backup is written into the same IndexedDB that
          clearing site data erases, while this file is the only copy
          that survives it. The quieter styling sat on the option that
          actually protects the user, on the one screen in PHOS where
          choosing wrong is unrecoverable.
        */}
        <Button className="w-full" onClick={handleExport} disabled={pending}>
          <Download className="mr-2 h-4 w-4" />
          {pending ? "Preparing export…" : "Export Data"}
        </Button>

        {outcome && (
          <p role="status" className="text-sm text-muted-foreground">
            {outcome}
          </p>
        )}
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </div>
    </ContentCard>
  );
}
