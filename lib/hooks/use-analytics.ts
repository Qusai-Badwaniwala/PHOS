"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
  const request = useRef(0);

  const fetchData = useCallback(async () => {
    const currentRequest = ++request.current;
    setLoading(true);
    setError(null);
    try {
      const result = await getAnalytics(dateRange);
      if (currentRequest === request.current) setData(result);
    } catch (err) {
      if (currentRequest === request.current)
        setError(err instanceof Error ? err : new Error("Failed to load analytics"));
    } finally {
      if (currentRequest === request.current) setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    void fetchData();
    return () => {
      request.current += 1;
    };
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}
