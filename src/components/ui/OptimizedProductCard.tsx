import { memo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useImageOptimization } from '../../hooks/useImageOptimization';
import { getEffectivePrice, isOnSale } from '../../services/productService';
import { formatPrice } from '../../utils/format';
import type { Product } from '../../types/product';

interface OptimizedProductCardProps {
  product: Product;
  onAddToCart?: (product: Product) => void;
  className?: string;
  lazy?: boolean;
}

/**
 * Componente de tarjeta de producto optimizado para rendimiento
 * Incluye lazy loading, memoización y manejo eficiente de eventos
 */
const OptimizedProductCard = memo<OptimizedProductCardProps>(({
  product,
  onAddToCart,
  className = '',
  lazy = true
}) => {
  const isAvailable = product.available !== false;
  const onSale = isOnSale(product.precio, product.precio_oferta);
  const effectivePrice = getEffectivePrice(product.precio, product.precio_oferta);

  // Optimización de imagen con lazy loading
  const { imageSrc, isLoading, hasError, imgRef } = useImageOptimization(
    product.image || '/placeholder-product.png'
  );

  // Memoizar callbacks para evitar re-renders innecesarios
  const handleAddToCart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAvailable || !onAddToCart) return;
    onAddToCart(product);
  }, [product, onAddToCart, isAvailable]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      // La navegación se maneja con el Link wrapper
    }
  }, []);

  // Clases condicionales optimizadas
  const cardClasses = [
    'product-card',
    className,
    !isAvailable ? 'product-card--unavailable' : '',
    isLoading ? 'product-card--loading' : '',
    hasError ? 'product-card--error' : ''
  ].filter(Boolean).join(' ');

  return (
    <Link
      to={`/product/${product.id}`}
      state={{ from: window.location.pathname + window.location.search }}
      className={cardClasses}
      onKeyDown={handleKeyDown}
      role="article"
      aria-label={`Producto: ${product.nombre} - ${formatPrice(product.precio)}`}
    >
      {/* Contenedor de imagen optimizado */}
      <div className="product-card__image-container">
        <img
          ref={imgRef}
          src={imageSrc}
          alt={product.nombre}
          className={`product-card__image ${isLoading ? 'product-card__image--loading' : ''}`}
          loading={lazy ? 'lazy' : 'eager'}
          decoding="async"
          width="200"
          height="200"
        />
        
        {onSale && <span className="product-card__sale-badge">-{Math.round(((product.precio - effectivePrice) / product.precio) * 100)}%</span>}

        {/* Overlay de estado */}
        {!isAvailable && (
          <div className="product-card__unavailable-overlay">
            <span>No disponible</span>
          </div>
        )}
        
        {/* Loading skeleton */}
        {isLoading && (
          <div className="product-card__image-skeleton" />
        )}
      </div>

      {/* Información del producto */}
      <div className="product-card__content">
        <div className="product-card__header">
          <p className="product-card__brand">{product.marca}</p>
          <h3 className="product-card__name">{product.nombre}</h3>
        </div>

        <div className="product-card__footer">
          <div className="product-card__price">
            {onSale && (
              <span className="product-card__price-old">
                {formatPrice(product.precio)}
              </span>
            )}
            <span className="product-card__price-amount">
              {formatPrice(effectivePrice)}
            </span>
          </div>

          <div className="product-card__actions">
            <button
              className={`product-card__add-btn ${!isAvailable ? 'product-card__add-btn--disabled' : ''}`}
              onClick={handleAddToCart}
              disabled={!isAvailable}
              aria-label={`Agregar ${product.nombre} al carrito`}
            >
              {isAvailable ? 'Agregar' : 'No disponible'}
            </button>
          </div>
        </div>

        {/* Badge de stock bajo */}
        {isAvailable && product.stock > 0 && product.stock <= 5 && (
          <div className="product-card__stock-warning">
            <span>¡Últimas {product.stock} unidades!</span>
          </div>
        )}
      </div>
    </Link>
  );
});

OptimizedProductCard.displayName = 'OptimizedProductCard';

export default OptimizedProductCard;
