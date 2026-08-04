"use client";

import { cn } from "@/lib/utils";
import React from "react";
import { ContentCard } from "@/components/shared/content-card";
import { Button } from "@/components/ui/button";
import { downloadJson, exportData } from "@/lib/api/backup";
import { Download, FileDown } from "lucide-react";

interface ExportWizardProps {
  className?: string;
}

export function ExportWizard({ className }: ExportWizardProps) {
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
      setOutcome(`Exported to ${result.filename}.`);
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

        <Button variant="outline" className="w-full" onClick={handleExport} disabled={pending}>
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
