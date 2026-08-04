"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { ContentCard } from "@/components/shared/content-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { importData } from "@/lib/api/backup";
import { clearAllAssignments } from "@/lib/api/activeSession";
import { useSettings } from "@/providers/settings-provider";
import { Upload, FileUp } from "lucide-react";

interface ImportWizardProps {
  onImported: () => void;
  className?: string;
}

export function ImportWizard({ onImported, className }: ImportWizardProps) {
  const { reload } = useSettings();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [file, setFile] = React.useState<File | null>(null);
  const [pending, setPending] = React.useState(false);
  const [errors, setErrors] = React.useState<string[]>([]);
  const [outcome, setOutcome] = React.useState<string | null>(null);

  const handleImport = async () => {
    if (!file) return;
    setPending(true);
    setErrors([]);
    setOutcome(null);
    try {
      const result = await importData(file);

      if (!result.success) {
        // A rejected import changes nothing — the engine validates the
        // whole file before writing anything — so these are shown as
        // correctable problems, not as a failure state.
        setErrors([...result.validationErrors]);
        return;
      }

      clearAllAssignments();
      await reload();
      setOutcome("Import complete.");
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      onImported();
    } catch (err) {
      setErrors([err instanceof Error ? err.message : "Failed to import data."]);
    } finally {
      setPending(false);
    }
  };

  return (
    <ContentCard className={cn(className)}>
      <div className="mb-4 flex items-center gap-2">
        <FileUp className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
        <h3 className="font-semibold">Import</h3>
      </div>

      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Load a PHOS export file created by this version of the application.
        </p>

        <Input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          aria-label="Choose a PHOS export file"
          disabled={pending}
          onChange={(event) => {
            setFile(event.target.files?.[0] ?? null);
            setErrors([]);
            setOutcome(null);
          }}
        />

        <Button
          variant="outline"
          className="w-full"
          disabled={!file || pending}
          onClick={handleImport}
        >
          <Upload className="mr-2 h-4 w-4" />
          {pending ? "Importing…" : "Import Data"}
        </Button>

        {errors.length > 0 && (
          <div role="alert" className="space-y-1">
            <p className="text-sm font-medium text-destructive">
              This file was not imported. Nothing was changed.
            </p>
            <ul className="list-disc space-y-1 pl-5 text-xs text-destructive">
              {errors.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          </div>
        )}

        {outcome && (
          <p role="status" className="text-sm text-muted-foreground">
            {outcome}
          </p>
        )}
      </div>
    </ContentCard>
  );
}
