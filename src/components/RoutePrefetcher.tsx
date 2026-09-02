import { useEffect } from 'react';

const RoutePrefetcher = () => {

  useEffect(() => {
    // Prefetch rutas críticas después de cargar la página
    const timer = setTimeout(() => {
      // Prefetch página de productos (más visitada)
      const link1 = document.createElement('link');
      link1.rel = 'prefetch';
      link1.href = '/product/1';
      document.head.appendChild(link1);

      // Prefetch catálogo
      const link2 = document.createElement('link');
      link2.rel = 'prefetch';
      link2.href = '/catalogo';
      document.head.appendChild(link2);

      // Preload cart page
      const link3 = document.createElement('link');
      link3.rel = 'preload';
      link3.href = '/cart';
      link3.as = 'document';
      document.head.appendChild(link3);
    }, 2000); // Después de 2s para no afectar carga inicial

    return () => {
      clearTimeout(timer);
    };
  }, []);

  return null;
};

export default RoutePrefetcher;
