"use client";

import { cn } from "@/lib/utils";
import React from "react";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

interface BackupEntry {
  id: string;
  date: string;
  type: "manual" | "auto";
  size: string;
  status: "success" | "failed";
}

interface BackupHistoryTableProps {
  entries?: BackupEntry[];
  onDelete: (backupId: string) => void;
  /** Id of the backup currently being deleted, if any. */
  deletingId?: string | null;
  className?: string;
}

export function BackupHistoryTable({
  entries,
  onDelete,
  deletingId,
  className,
}: BackupHistoryTableProps) {
  if (!entries || entries.length === 0) {
    return (
      <div className={cn(className)}>
        <h3 className="mb-4 text-lg font-semibold">Backup History</h3>
        <EmptyState
          title="No backups found"
          description="Create your first backup to see it listed here."
        />
      </div>
    );
  }

  return (
    <div className={cn(className)}>
      <h3 className="mb-4 text-lg font-semibold">Backup History</h3>
      <div className="overflow-hidden rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Date</th>
              <th className="px-4 py-3 text-left font-medium">Type</th>
              <th className="px-4 py-3 text-left font-medium">Size</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {entries.map((entry) => (
              <tr key={entry.id} className="transition-colors hover:bg-accent/50">
                <td className="px-4 py-3 tabular-nums">{entry.date}</td>
                <td className="px-4 py-3 capitalize">{entry.type}</td>
                <td className="px-4 py-3 tabular-nums">{entry.size}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={entry.status === "success" ? "success" : "error"}>
                    {entry.status}
                  </StatusBadge>
                </td>
                <td className="px-4 py-3 text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    aria-label={`Delete backup from ${entry.date}`}
                    disabled={deletingId === entry.id}
                    onClick={() => onDelete(entry.id)}
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
