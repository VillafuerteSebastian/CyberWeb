/**
 * Servicio de caché inteligente para llamadas a API
 * Implementa caché en memoria, localStorage y estrategias de invalidación
 */
class CacheService {
  private memoryCache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutos

  /**
   * Obtener caché (memoria o localStorage)
   */
  private getCache(key: string): any | null {
    // Intentar caché en memoria primero
    const memoryItem = this.memoryCache.get(key);
    if (memoryItem && Date.now() - memoryItem.timestamp < memoryItem.ttl) {
      return memoryItem.data;
    }

    // Intentar localStorage
    try {
      const stored = localStorage.getItem(`api_cache_${key}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Date.now() - parsed.timestamp < parsed.ttl) {
          // Restaurar a caché en memoria
          this.memoryCache.set(key, parsed);
          return parsed.data;
        }
        // Limpiar caché expirada
        localStorage.removeItem(`api_cache_${key}`);
      }
    } catch (err) {
      console.warn('Error reading cache:', err);
    }

    return null;
  }

  /**
   * Guardar en caché (memoria y localStorage)
   */
  private setCache(key: string, data: any, ttl: number = this.DEFAULT_TTL): void {
    const cacheItem = {
      data,
      timestamp: Date.now(),
      ttl
    };

    // Guardar en memoria
    this.memoryCache.set(key, cacheItem);

    // Guardar en localStorage
    try {
      localStorage.setItem(`api_cache_${key}`, JSON.stringify(cacheItem));
    } catch (err) {
      console.warn('Error setting cache:', err);
    }
  }

  /**
   * Invalidar caché específica
   */
  public invalidateCache(key: string): void {
    this.memoryCache.delete(key);
    try {
      localStorage.removeItem(`api_cache_${key}`);
    } catch (err) {
      console.warn('Error invalidating cache:', err);
    }
  }

  /**
   * Limpiar toda la caché
   */
  public clearCache(): void {
    this.memoryCache.clear();
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('api_cache_')) {
          localStorage.removeItem(key);
        }
      });
    } catch (err) {
      console.warn('Error clearing cache:', err);
    }
  }

  /**
   * Request con caché inteligente
   */
  public async cachedRequest<T>(
    key: string,
    requestFn: () => Promise<T>,
    ttl: number = this.DEFAULT_TTL,
    forceRefresh: boolean = false
  ): Promise<T> {
    // Si no forzamos refresh, intentar caché
    if (!forceRefresh) {
      const cached = this.getCache(key);
      if (cached !== null) {
        return cached;
      }
    }

    // Ejecutar request
    try {
      const result = await requestFn();
      this.setCache(key, result, ttl);
      return result;
    } catch (error) {
      // Si falla el request, intentar caché expirada como fallback
      const cached = this.getCache(key);
      if (cached !== null) {
        console.warn('Request failed, using expired cache:', error);
        return cached;
      }
      throw error;
    }
  }

  /**
   * Batch requests con caché
   */
  public async batchCachedRequest<T>(
    requests: Array<{
      key: string;
      requestFn: () => Promise<T>;
      ttl?: number;
    }>
  ): Promise<Map<string, T>> {
    const results = new Map<string, T>();
    const promises = requests.map(async ({ key, requestFn, ttl }) => {
      try {
        const result = await this.cachedRequest(key, requestFn, ttl);
        results.set(key, result);
      } catch (error) {
        console.error(`Failed batch request for ${key}:`, error);
      }
    });

    await Promise.allSettled(promises);
    return results;
  }

  /**
   * Prefetch de datos críticos
   */
  public async prefetch<T>(key: string, requestFn: () => Promise<T>, ttl?: number): Promise<void> {
    // Solo prefetch si no está en caché
    if (this.getCache(key) === null) {
      try {
        await this.cachedRequest(key, requestFn, ttl);
      } catch (error) {
        // Silently fail prefetch
        console.warn('Prefetch failed:', error);
      }
    }
  }

  /**
   * Estadísticas de caché
   */
  public getCacheStats(): {
    memoryCacheSize: number;
    localStorageCacheSize: number;
    totalCacheSize: number;
  } {
    let localStorageCacheSize = 0;
    try {
      const keys = Object.keys(localStorage);
      localStorageCacheSize = keys.filter(key => key.startsWith('api_cache_')).length;
    } catch (err) {
      console.warn('Error getting localStorage cache size:', err);
    }

    return {
      memoryCacheSize: this.memoryCache.size,
      localStorageCacheSize,
      totalCacheSize: this.memoryCache.size + localStorageCacheSize
    };
  }
}

// Instancia singleton
const cacheService = new CacheService();
export default cacheService;
