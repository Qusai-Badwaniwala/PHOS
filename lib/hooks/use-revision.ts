"use client";

import { useState, useEffect, useCallback } from "react";
import { getRevision } from "@/lib/api/revision";
import type { RevisionDTO } from "@/types/dto";

export interface UseRevisionReturn {
  data: RevisionDTO | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useRevision(): UseRevisionReturn {
  const [data, setData] = useState<RevisionDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getRevision();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to load revision"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}
