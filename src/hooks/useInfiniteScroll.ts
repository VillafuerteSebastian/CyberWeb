import { useState, useEffect, useCallback } from 'react';

/**
 * Hook para implementar infinite scroll con virtualización
 * Optimizado para grandes listas de productos
 */
export function useInfiniteScroll<T>(
  fetchFunction: (page: number, limit: number) => Promise<{ data: T[]; hasMore: boolean }>,
  initialLimit: number = 20
) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;

    setLoading(true);
    setError(null);

    try {
      const result = await fetchFunction(page, initialLimit);
      
      setItems(prev => [...prev, ...result.data]);
      setHasMore(result.hasMore);
      setPage(prev => prev + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar más elementos');
    } finally {
      setLoading(false);
    }
  }, [fetchFunction, page, initialLimit, loading, hasMore]);

  const reset = useCallback(() => {
    setItems([]);
    setPage(1);
    setHasMore(true);
    setLoading(false);
    setError(null);
  }, []);

  useEffect(() => {
    loadMore();
  }, []);

  return {
    items,
    loading,
    hasMore,
    error,
    loadMore,
    reset
  };
}

/**
 * Hook para detectar cuando el usuario llega al final de la página
 */
export function useScrollDetection(threshold: number = 100) {
  const [isAtBottom, setIsAtBottom] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const scrollHeight = document.documentElement.scrollHeight;
      const clientHeight = window.innerHeight;

      const isBottom = scrollTop + clientHeight >= scrollHeight - threshold;
      setIsAtBottom(isBottom);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [threshold]);

  return isAtBottom;
}
