"use client";
import React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Trash2 } from "lucide-react";
import type { BackupEntryDTO } from "@/types/dto";
export function BackupHistoryTable({
  entries,
  onDelete,
  deletingId,
  className,
}: {
  entries?: BackupEntryDTO[];
  onDelete: (id: string) => void;
  deletingId?: string | null;
  className?: string;
}) {
  const [selected, setSelected] = React.useState<BackupEntryDTO | null>(null);
  return (
    <section className={className}>
      <h2 className="font-serif text-2xl">Saved restore points</h2>
      {!entries?.length ? (
        <p className="text-muted-foreground mt-4 text-sm">
          No restore points yet. Create one to keep a verified copy here.
        </p>
      ) : (
        <ul className="mt-4 divide-y border-y">
          {entries.map((entry) => (
            <li key={entry.id} className="flex min-h-20 items-center justify-between gap-4 py-4">
              <div>
                <p className="font-medium">{entry.date}</p>
                <p className="text-muted-foreground mt-1 text-sm">{entry.size} · Verified copy</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Delete backup from ${entry.date}`}
                disabled={Boolean(deletingId)}
                onClick={() => setSelected(entry)}
              >
                <Trash2 size={18} />
              </Button>
            </li>
          ))}
        </ul>
      )}
      <Dialog
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove this restore point?</DialogTitle>
            <DialogDescription>
              The copy from {selected?.date} will be deleted. Your current Hifz record stays intact.
              This copy cannot be recovered after removal.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelected(null)}>
              Keep restore point
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (selected) onDelete(selected.id);
                setSelected(null);
              }}
            >
              Remove restore point
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
