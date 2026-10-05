"use client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { TimelineEntryDTO } from "@/types/dto";
export function HistoryDrawer({
  entry,
  onClose,
  className,
}: {
  entry: TimelineEntryDTO | null;
  onClose: () => void;
  className?: string;
}) {
  return (
    <Dialog
      open={!!entry}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className={className}>
        <DialogHeader>
          <DialogTitle>{entry?.title}</DialogTitle>
          <DialogDescription>
            {entry?.date} · {entry?.time}
          </DialogDescription>
        </DialogHeader>
        <p className="mt-3 text-base">{entry?.description}</p>
        <dl className="my-3 divide-y border-y">
          <div className="flex justify-between py-4">
            <dt className="text-muted-foreground">Record</dt>
            <dd>{entry?.status === "pending" ? "In progress" : "Closed"}</dd>
          </div>
          {entry?.durationSeconds !== undefined && (
            <div className="flex justify-between py-4">
              <dt className="text-muted-foreground">Elapsed time</dt>
              <dd>
                {Math.floor(entry.durationSeconds / 60)}m {entry.durationSeconds % 60}s
              </dd>
            </div>
          )}
          {entry?.weakPages !== undefined && (
            <div className="flex justify-between py-4">
              <dt className="text-muted-foreground">Pages marked shaky</dt>
              <dd>{entry.weakPages}</dd>
            </div>
          )}
        </dl>
        <Button variant="outline" onClick={onClose}>
          Close details
        </Button>
      </DialogContent>
    </Dialog>
  );
}
