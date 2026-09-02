import { useState, useEffect, useCallback } from 'react';

/**
 * Hook para caché inteligente de llamadas a API
 * Incluye TTL, invalidación y manejo de errores
 */
interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export function useApiCache<T>(
  key: string,
  fetchFunction: () => Promise<T>,
  ttl: number = 5 * 60 * 1000 // 5 minutos por defecto
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number>(0);

  // Obtener caché de localStorage
  const getCache = useCallback((): CacheItem<T> | null => {
    try {
      const cached = localStorage.getItem(`api_cache_${key}`);
      if (cached) {
        const parsed = JSON.parse(cached) as CacheItem<T>;
        const now = Date.now();
        
        if (now - parsed.timestamp < parsed.ttl) {
          return parsed;
        }
      }
    } catch (err) {
      console.warn('Error reading cache:', err);
    }
    return null;
  }, [key]);

  // Guardar en caché
  const setCache = useCallback((item: T) => {
    try {
      const cacheItem: CacheItem<T> = {
        data: item,
        timestamp: Date.now(),
        ttl
      };
      localStorage.setItem(`api_cache_${key}`, JSON.stringify(cacheItem));
    } catch (err) {
      console.warn('Error setting cache:', err);
    }
  }, [key, ttl]);

  // Invalidar caché
  const invalidateCache = useCallback(() => {
    try {
      localStorage.removeItem(`api_cache_${key}`);
    } catch (err) {
      console.warn('Error invalidating cache:', err);
    }
  }, [key]);

  // Cargar datos (con o sin caché)
  const fetchData = useCallback(async (forceRefresh: boolean = false) => {
    setLoading(true);
    setError(null);

    try {
      // Intentar obtener de caché primero
      if (!forceRefresh) {
        const cached = getCache();
        if (cached) {
          setData(cached.data);
          setLastUpdated(cached.timestamp);
          setLoading(false);
          return;
        }
      }

      // Si no hay caché válida, llamar a la API
      const result = await fetchFunction();
      setData(result);
      setCache(result);
      setLastUpdated(Date.now());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  }, [fetchFunction, getCache, setCache]);

  // Cargar datos al montar
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    lastUpdated,
    refetch: () => fetchData(true),
    invalidateCache
  };
}

/**
 * Hook para caché de múltiples llamadas a API
 */
export function useMultiApiCache<T>(
  keys: string[],
  fetchFunctions: (() => Promise<T>)[],
  ttl: number = 5 * 60 * 1000
) {
  const [cache, setCache] = useState<Map<string, T>>(new Map());
  const [loading, setLoading] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Map<string, string>>(new Map());

  const fetchSingle = useCallback(async (key: string, fetchFunction: () => Promise<T>) => {
    setLoading(prev => new Set(prev).add(key));
    setErrors(prev => {
      const newErrors = new Map(prev);
      newErrors.delete(key);
      return newErrors;
    });

    try {
      const result = await fetchFunction();
      setCache(prev => new Map(prev).set(key, result));
      
      // Guardar en localStorage
      try {
        const cacheItem = {
          data: result,
          timestamp: Date.now(),
          ttl
        };
        localStorage.setItem(`api_cache_${key}`, JSON.stringify(cacheItem));
      } catch (err) {
        console.warn('Error setting cache:', err);
      }
    } catch (err) {
      setErrors(prev => new Map(prev).set(key, err instanceof Error ? err.message : 'Error'));
    } finally {
      setLoading(prev => {
        const newLoading = new Set(prev);
        newLoading.delete(key);
        return newLoading;
      });
    }
  }, [ttl]);

  const fetchAll = useCallback(async () => {
    const promises = keys.map((key, index) => fetchSingle(key, fetchFunctions[index]));
    await Promise.allSettled(promises);
  }, [keys, fetchFunctions, fetchSingle]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return {
    cache,
    loading,
    errors,
    fetchSingle,
    fetchAll,
    isLoading: (key: string) => loading.has(key),
    getError: (key: string) => errors.get(key),
    getData: (key: string) => cache.get(key)
  };
}
