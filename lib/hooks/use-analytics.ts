"use client";

import { useState, useEffect, useCallback } from "react";
import { getAnalytics } from "@/lib/api/analytics";
import type { AnalyticsDTO, DateRange } from "@/types/dto";

export interface UseAnalyticsReturn {
  data: AnalyticsDTO | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useAnalytics(dateRange: DateRange): UseAnalyticsReturn {
  const [data, setData] = useState<AnalyticsDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getAnalytics(dateRange);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to load analytics"));
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}
