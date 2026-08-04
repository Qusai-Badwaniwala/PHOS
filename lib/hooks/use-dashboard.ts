"use client";

import { useState, useEffect, useCallback } from "react";
import { getDashboardData } from "@/lib/api/dashboard";
import type { DashboardDTO } from "@/types/dto";

export interface UseDashboardReturn {
  data: DashboardDTO | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useDashboard(): UseDashboardReturn {
  const [data, setData] = useState<DashboardDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getDashboardData();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to load dashboard"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}
