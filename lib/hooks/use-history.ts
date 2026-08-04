"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { getHistory } from "@/lib/api/history";
import type { HistoryDTO, HistoryFiltersDTO } from "@/types/dto";

export interface UseHistoryReturn {
  data: HistoryDTO | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useHistory(filters?: HistoryFiltersDTO): UseHistoryReturn {
  const [data, setData] = useState<HistoryDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Depend on the filter *values*, not the object reference. A caller
  // that passes a new object literal on every render (easy to do by
  // accident, and the direct cause of a past infinite-request-loop bug
  // here) would otherwise still recreate `fetchData` every render.
  // JSON-stringifying the actual field values makes this hook robust
  // regardless of caller discipline, while callers are still
  // encouraged to memoize their filters object for their own render
  // performance.
  const filtersKey = useMemo(() => JSON.stringify(filters ?? {}), [filters]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getHistory(filters);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to load history"));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- filtersKey is the intentional, value-based dependency; `filters` itself is read inside but must not gate this callback's identity.
  }, [filtersKey]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}
