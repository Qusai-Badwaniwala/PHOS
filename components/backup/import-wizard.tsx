"use client";
import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { importData, previewImport } from "@/lib/api/backup";
import { clearAllAssignments } from "@/lib/api/activeSession";
import { useSettings } from "@/providers/settings-provider";
import { formatDateTimePreferred } from "@/lib/format";
export function ImportWizard({
  onImported,
  className,
}: {
  onImported: () => void;
  className?: string;
}) {
  const { reload } = useSettings();
  const input = React.useRef<HTMLInputElement>(null);
  const [file, setFile] = React.useState<File | null>(null);
  const [preview, setPreview] = React.useState<Awaited<ReturnType<typeof previewImport>> | null>(
    null,
  );
  const [pending, setPending] = React.useState(false);
  const [errors, setErrors] = React.useState<string[]>([]);
  const [outcome, setOutcome] = React.useState<string | null>(null);
  const [confirm, setConfirm] = React.useState(false);
  const generation = React.useRef(0);
  const choose = async (selected: File | null) => {
    const token = ++generation.current;
    setFile(selected);
    setPreview(null);
    setErrors([]);
    setOutcome(null);
    if (!selected) return;
    setPending(true);
    try {
      const result = await previewImport(selected);
      if (token === generation.current) {
        setPreview(result);
        setErrors(result.errors);
      }
    } catch (err) {
      if (token === generation.current)
        setErrors([err instanceof Error ? err.message : "Could not read this file."]);
    } finally {
      if (token === generation.current) setPending(false);
    }
  };
  const restore = async () => {
    if (!file) return;
    setPending(true);
    setErrors([]);
    try {
      const result = await importData(file);
      if (!result.success) {
        setErrors([...result.validationErrors]);
        setConfirm(false);
        return;
      }
      clearAllAssignments();
      setConfirm(false);
      setFile(null);
      setPreview(null);
      if (input.current) input.current.value = "";
      setOutcome(
        "Your record was restored. A verified safety copy of this device’s previous record is available in restore points below.",
      );
      await reload();
      onImported();
    } catch (err) {
      setErrors([err instanceof Error ? err.message : "Could not restore the record."]);
      setConfirm(false);
    } finally {
      setPending(false);
    }
  };
  return (
    <section className={className} aria-labelledby="file-restore-title">
      <h2 id="file-restore-title" className="font-serif text-2xl">
        Restore an exported file
      </h2>
      <p className="text-muted-foreground mt-2 text-sm">
        Review a PHOS file, then restore its complete record. The file is read on this device.
      </p>
      <Input
        className="mt-5 min-h-12"
        ref={input}
        type="file"
        accept="application/json,.json"
        aria-label="Choose a PHOS export file"
        disabled={pending}
        onChange={(event) => void choose(event.target.files?.[0] ?? null)}
      />
      {pending && !confirm && (
        <p role="status" className="mt-3 text-sm">
          Checking the complete file…
        </p>
      )}
      {preview?.valid && (
        <div className="border-primary mt-5 border-l-2 pl-5">
          <p className="font-medium">{file?.name}</p>
          <p className="text-muted-foreground mt-1 text-sm">
            {preview.exportedAt
              ? `Exported ${formatDateTimePreferred(preview.exportedAt)}`
              : "Export date unavailable"}
          </p>
          <dl className="mt-4 grid grid-cols-2 gap-4">
            {[
              ["Learned pages", preview.learnedPages],
              ["Study sessions", preview.sessions],
              ["Recall records", preview.recalls],
              ["Exams", preview.exams],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-muted-foreground text-sm">{label}</dt>
                <dd className="text-lg tabular-nums">{value}</dd>
              </div>
            ))}
          </dl>
          {preview.openSessions > 0 && (
            <p className="mt-3 text-sm">Includes an open study session.</p>
          )}
          {preview.warnings.map((warning) => (
            <p key={warning} className="text-warning mt-3 text-sm">
              {warning}
            </p>
          ))}
          <p className="text-muted-foreground mt-4 text-sm">
            This replaces this device’s pages, history, exams, roadmap, and preferences. PHOS
            verifies a safety copy first.
          </p>
          <Button className="mt-5" disabled={pending} onClick={() => setConfirm(true)}>
            Review full restore
          </Button>
        </div>
      )}
      {errors.length > 0 && (
        <div role="alert" className="text-destructive mt-4 text-sm">
          <p className="font-medium">The record was not restored.</p>
          <ul className="mt-2 list-disc space-y-2 pl-5">
            {errors.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        </div>
      )}
      {outcome && (
        <p role="status" className="text-primary mt-4 text-sm">
          {outcome}
        </p>
      )}
      <Dialog
        open={confirm}
        onOpenChange={(open) => {
          if (!pending) setConfirm(open);
        }}
      >
        <DialogContent
          onPointerDownOutside={(event) => {
            if (pending) event.preventDefault();
          }}
          onEscapeKeyDown={(event) => {
            if (pending) event.preventDefault();
          }}
        >
          <DialogHeader>
            <DialogTitle>Restore this complete record?</DialogTitle>
            <DialogDescription>
              PHOS will verify a safety copy of your current record, then replace it with{" "}
              {file?.name}. This is a full restore; histories are not merged.
            </DialogDescription>
          </DialogHeader>
          <p className="text-muted-foreground text-sm">
            The safety copy remains in this browser’s restore points. Keep your exported file
            outside the browser too.
          </p>
          <DialogFooter>
            <Button variant="outline" disabled={pending} onClick={() => setConfirm(false)}>
              Keep current record
            </Button>
            <Button disabled={pending} onClick={() => void restore()}>
              {pending ? "Saving safety copy & restoring…" : "Restore this record"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
