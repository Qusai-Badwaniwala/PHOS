"use client";

import { useState, useEffect, useCallback } from "react";
import { getBackupStatus } from "@/lib/api/backup";
import type { BackupStatusDTO } from "@/types/dto";

export interface UseBackupReturn {
  data: BackupStatusDTO | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useBackup(): UseBackupReturn {
  const [data, setData] = useState<BackupStatusDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getBackupStatus();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to load backup status"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}
