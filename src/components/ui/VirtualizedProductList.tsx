import { memo, useEffect, useRef, useState, useCallback } from 'react';
import OptimizedProductCard from './OptimizedProductCard';
import type { Product } from '../../types/product';

interface VirtualizedProductListProps {
  products: Product[];
  onAddToCart?: (product: Product) => void;
  itemHeight?: number;
  containerHeight?: number;
  overscan?: number;
  className?: string;
}

/**
 * Componente de lista virtualizada para grandes cantidades de productos
 * Renderiza solo los elementos visibles para optimizar rendimiento
 */
const VirtualizedProductList = memo<VirtualizedProductListProps>(({
  products,
  onAddToCart,
  itemHeight = 300,
  containerHeight = 600,
  overscan = 5,
  className = ''
}) => {
  const [scrollTop, setScrollTop] = useState(0);
  const [containerSize, setContainerSize] = useState({ width: 0, height: containerHeight });
  const scrollElementRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Calcular elementos visibles
  const visibleCount = Math.ceil(containerSize.height / itemHeight);
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(products.length, startIndex + visibleCount + overscan * 2);
  
  // Productos visibles
  const visibleProducts = products.slice(startIndex, endIndex);

  // Manejar scroll
  const handleScroll = useCallback(() => {
    if (scrollElementRef.current) {
      setScrollTop(scrollElementRef.current.scrollTop);
    }
  }, []);

  // Actualizar tamaño del contenedor
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setContainerSize({ width: rect.width, height: rect.height });
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Calcular posición total
  const totalHeight = products.length * itemHeight;

  return (
    <div 
      ref={containerRef}
      className={`virtualized-list ${className}`}
      style={{ height: containerHeight }}
    >
      <div
        ref={scrollElementRef}
        className="virtualized-list__scroll-container"
        onScroll={handleScroll}
        style={{ height: '100%', overflow: 'auto' }}
      >
        <div
          className="virtualized-list__content"
          style={{ height: totalHeight, position: 'relative' }}
        >
          {visibleProducts.map((product, index) => {
            const actualIndex = startIndex + index;
            const top = actualIndex * itemHeight;
            
            return (
              <div
                key={product.id}
                className="virtualized-list__item"
                style={{
                  position: 'absolute',
                  top: `${top}px`,
                  left: 0,
                  right: 0,
                  height: `${itemHeight}px`
                }}
              >
                <OptimizedProductCard
                  product={product}
                  onAddToCart={onAddToCart}
                  className="virtualized-list__product-card"
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
});

VirtualizedProductList.displayName = 'VirtualizedProductList';

export default VirtualizedProductList;
