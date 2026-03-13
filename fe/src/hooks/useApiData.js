import { useState, useEffect, useCallback } from "react";

/**
 * Custom hook for fetching API data with loading/error states.
 * Keeps components clean by extracting fetch logic.
 *
 * @param {Function} fetchFn - Async function that returns data
 * @param {Object} options - { immediate: bool, fallback: any }
 * @returns {{ data, loading, error, refetch }}
 */
export function useApiData(fetchFn, options = {}) {
  const { immediate = true, fallback = null } = options;
  const [data, setData] = useState(fallback);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState(null);

  const refetch = useCallback(async (...args) => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchFn(...args);
      setData(result?.data ?? result);
      return result;
    } catch (err) {
      setError(err?.message || "Có lỗi xảy ra");
      return null;
    } finally {
      setLoading(false);
    }
  }, [fetchFn]);

  useEffect(() => {
    if (immediate) refetch();
  }, [immediate, refetch]);

  return { data, loading, error, refetch, setData };
}

/**
 * Format number as Vietnamese currency string
 */
export function formatMoney(value) {
  if (value == null) return "0 VND";
  return value.toLocaleString("vi-VN") + " VND";
}

/**
 * Format date string to Vietnamese locale
 */
export function formatDate(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}
