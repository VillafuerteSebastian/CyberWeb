import { useState, useEffect, useRef } from 'react';

/**
 * Hook para lazy loading de imágenes con optimización
 * Incluye placeholders, blur effects y manejo de errores
 */
export function useImageOptimization(
  src: string,
  placeholder: string = '/placeholder-product.png'
) {
  const [imageSrc, setImageSrc] = useState<string>(placeholder);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const img = new Image();
    
    img.onload = () => {
      setImageSrc(src);
      setIsLoading(false);
      setHasError(false);
    };

    img.onerror = () => {
      setImageSrc(placeholder);
      setIsLoading(false);
      setHasError(true);
    };

    // Optimización: cargar imagen solo cuando esté en viewport
    if (imgRef.current && 'IntersectionObserver' in window) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              img.src = src;
              observer.disconnect();
            }
          });
        },
        { threshold: 0.1 }
      );

      observer.observe(imgRef.current);
      return () => observer.disconnect();
    } else {
      // Fallback para navegadores sin IntersectionObserver
      img.src = src;
    }
  }, [src, placeholder]);

  return {
    imageSrc,
    isLoading,
    hasError,
    imgRef
  };
}

/**
 * Hook para precargar imágenes críticas
 */
export function useImagePreload(images: string[]) {
  const [preloadedImages, setPreloadedImages] = useState<Set<string>>(new Set());
  const [isPreloading, setIsPreloading] = useState(false);

  useEffect(() => {
    if (images.length === 0) return;

    setIsPreloading(true);
    
    const preloadPromises = images.map(src => {
      return new Promise<string>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(src);
        img.onerror = () => reject(src);
        img.src = src;
      });
    });

    Promise.allSettled(preloadPromises).then((results) => {
      const successful = new Set<string>();
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          successful.add(images[index]);
        }
      });
      setPreloadedImages(successful);
      setIsPreloading(false);
    });
  }, [images]);

  return {
    preloadedImages,
    isPreloading,
    isPreloaded: (src: string) => preloadedImages.has(src)
  };
}
