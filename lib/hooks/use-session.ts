"use client";

import { useState, useEffect, useCallback } from "react";
import { getSession } from "@/lib/api/session";
import type { SessionDTO } from "@/types/dto";

export interface UseSessionReturn {
  data: SessionDTO | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useSession(): UseSessionReturn {
  const [data, setData] = useState<SessionDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getSession();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to load session"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}
