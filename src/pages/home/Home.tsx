import "./Home.css";
import { useEffect, useMemo, useRef, useState, useCallback, memo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  HiOutlineTruck,
  HiOutlineShieldCheck,
  HiOutlineCreditCard,
  HiOutlineChatBubbleLeftRight,
  HiChevronLeft,
  HiChevronRight,
} from "react-icons/hi2";
import { FaShoppingCart } from "react-icons/fa";
import { useCart } from "../../context/CartContext";
import productService, { getEffectivePrice, isOnSale } from "../../services/productService";
import RoutePrefetcher from "../../components/RoutePrefetcher";
import { formatPrice } from "../../utils/format";

type ProductType = {
  tipo: string;
};

type ProductCategoriaExtra = {
  categoria: string;
  tipos: ProductType[];
};

type Product = {
  id: string;
  nombre: string;
  descripcion: string;
  precio: number;
  precio_oferta?: number | null;
  categoria: string;
  marca: string;
  tipos: ProductType[];
  categorias_extra: ProductCategoriaExtra[];
  stock: number;
  image?: string;
  available?: boolean;
};

const TRUST_BADGES = [
  { icon: <HiOutlineTruck />, title: "Envíos rápidos", text: "A todo Puntarenas y alrededores" },
  { icon: <HiOutlineShieldCheck />, title: "Garantía real", text: "Soporte directo con la tienda" },
  { icon: <HiOutlineCreditCard />, title: "Pago flexible", text: "SINPE o transferencia" },
  { icon: <HiOutlineChatBubbleLeftRight />, title: "Atención cercana", text: "Te respondemos por WhatsApp" },
];

const ProductCard = memo(({ product, onAddToCart, onNavigate }: {
  product: Product;
  onAddToCart: (product: Product) => void;
  onNavigate: (id: string) => void;
}) => {
  const isAvailable = product.available !== false;
  const lowStock = isAvailable && product.stock > 0 && product.stock <= 5;
  const onSale = isOnSale(product.precio, product.precio_oferta);
  const effectivePrice = getEffectivePrice(product.precio, product.precio_oferta);

  const handleAddToCart = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAvailable) return;
    onAddToCart(product);
  }, [product, onAddToCart, isAvailable]);

  const handleNavigate = useCallback(() => {
    onNavigate(product.id);
  }, [product.id, onNavigate]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      handleNavigate();
    }
  }, [handleNavigate]);

  return (
    <div
      className="product-card"
      role="button"
      tabIndex={0}
      onClick={handleNavigate}
      onKeyDown={handleKeyDown}
    >
      <div className="product-card-media">
        <img
          src={product.image || "/placeholder-product.png"}
          alt={product.nombre}
          onError={(e) => {
            e.currentTarget.src = "/placeholder-product.png";
          }}
          loading="lazy"
        />

        {onSale && (
          <span className="sale-badge">
            -{Math.round(((product.precio - effectivePrice) / product.precio) * 100)}%
          </span>
        )}

        {!isAvailable && (
          <span className="out-of-stock-badge">No disponible</span>
        )}

        {lowStock && (
          <span className="low-stock-badge">¡Últimas {product.stock}!</span>
        )}

        {/* Versión compacta (solo móvil): ícono flotando sobre la imagen,
            en vez de un botón de texto a todo lo ancho que alarga la
            tarjeta — así entra más contenido en pantalla sin scroll. */}
        <button
          type="button"
          className="add-cart-fab"
          disabled={!isAvailable}
          onClick={handleAddToCart}
          aria-label={isAvailable ? "Agregar al carrito" : "No disponible"}
        >
          <FaShoppingCart />
        </button>
      </div>

      {product.marca && <p className="product-card-brand">{product.marca}</p>}
      <h3>{product.nombre}</h3>
      {onSale ? (
        <p className="product-card-price">
          <span className="product-card-price-old">
            {formatPrice(product.precio)}
          </span>{" "}
          {formatPrice(effectivePrice)}
        </p>
      ) : (
        <p className="product-card-price">{formatPrice(product.precio)}</p>
      )}

      <button
        className="add-cart-btn"
        disabled={!isAvailable}
        onClick={handleAddToCart}
      >
        {isAvailable ? "Agregar al carrito" : "No disponible"}
      </button>
    </div>
  );
});

const CarouselArrow = memo(({ direction, onClick, disabled }: {
  direction: "left" | "right";
  onClick: () => void;
  disabled: boolean;
}) => (
  <button
    type="button"
    className={`carousel-arrow carousel-arrow-${direction}`}
    onClick={onClick}
    disabled={disabled}
    aria-label={direction === "left" ? "Productos anteriores" : "Siguientes productos"}
  >
    {direction === "left" ? <HiChevronLeft /> : <HiChevronRight />}
  </button>
));

const ProductCardSkeleton = () => (
  <div className="product-card product-card-skeleton" aria-hidden="true">
    <div className="skeleton-block skeleton-media" />
    <div className="skeleton-block skeleton-line" style={{ width: "40%" }} />
    <div className="skeleton-block skeleton-line" style={{ width: "80%" }} />
    <div className="skeleton-block skeleton-line" style={{ width: "50%" }} />
    <div className="skeleton-block skeleton-btn" />
  </div>
);

const Home = () => {
  const { addToCart } = useCart();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const carouselRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);

        // Se trae el catálogo completo (paginado) en vez de solo los últimos
        // 10, porque el carrusel necesita ver todas las categorías y
        // subcategorías disponibles para poder mostrar al menos un producto
        // de cada una.
        const PAGE_SIZE = 100;
        let page = 1;
        let rawProducts: any[] = [];

        while (true) {
          const response = await productService.getProducts({ page, limit: PAGE_SIZE });
          rawProducts = rawProducts.concat(response.data);

          if (!response.hasMore) break;
          page += 1;
        }

        const formattedProducts: Product[] = rawProducts.map((product: any) => ({
          id: String(product.id || product._id || ""),
          nombre: product.nombre || "",
          descripcion: product.descripcion || "",
          precio: Number(product.precio ?? 0),
          precio_oferta:
            product.precio_oferta !== null && product.precio_oferta !== undefined
              ? Number(product.precio_oferta)
              : null,
          categoria: product.categoria || "",
          marca: product.marca || "",
          tipos: Array.isArray(product.tipos) ? product.tipos : [],
          categorias_extra: Array.isArray(product.categorias_extra) ? product.categorias_extra : [],
          stock: Number(product.stock ?? 0),
          image: product.image || "/placeholder-product.png",
          available: product.available !== false,
        }));

        setProducts(formattedProducts);
      } catch (error) {
        console.error("Error al cargar productos:", error);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  // Cantidad objetivo de tarjetas en el carrusel de destacados. Si el
  // catálogo tiene menos productos que esto, el carrusel simplemente muestra
  // todos los que haya.
  const FEATURED_TARGET_COUNT = 10;

  // Productos del carrusel de destacados: al menos uno de cada "sección"
  // (categoría + subcategoría + tipo) del catálogo, y si con eso no se llega
  // a FEATURED_TARGET_COUNT, se suman más productos (dos o más por sección)
  // hasta completarlo o quedarse sin productos distintos. Un producto puede
  // pertenecer a varias secciones a la vez si además está listado en
  // categorías adicionales (`categorias_extra`).
  const featuredProducts = useMemo(() => {
    const buckets = new Map<string, Product[]>();

    const addToBucket = (categoria: string, subcategoria: string, tipo: string, product: Product) => {
      if (!categoria) return;
      const key = `${categoria}::${subcategoria || "general"}::${tipo || "general"}`;
      const bucket = buckets.get(key);
      if (bucket) {
        if (!bucket.some((p) => p.id === product.id)) bucket.push(product);
      } else {
        buckets.set(key, [product]);
      }
    };

    products.forEach((product) => {
      addToBucket(product.categoria, product.tipos[0]?.tipo || "", product.tipos[1]?.tipo || "", product);
      product.categorias_extra.forEach((extra) => {
        addToBucket(extra.categoria, extra.tipos?.[0]?.tipo || "", extra.tipos?.[1]?.tipo || "", product);
      });
    });

    const sectionKeys = Array.from(buckets.keys()).sort((a, b) => a.localeCompare(b));

    const selected: Product[] = [];
    const selectedIds = new Set<string>();

    const takeNextFrom = (key: string): boolean => {
      const bucket = buckets.get(key)!;
      const next = bucket.find((p) => !selectedIds.has(p.id));
      if (!next) return false;
      selected.push(next);
      selectedIds.add(next.id);
      return true;
    };

    // Primera pasada: un producto de cada sección.
    sectionKeys.forEach((key) => takeNextFrom(key));

    // Si faltan productos para llegar al objetivo, se hacen rondas
    // adicionales tomando el siguiente producto disponible de cada sección
    // (dos o más por sección, si esa sección tiene stock de sobra) hasta
    // completar el objetivo o agotar productos distintos.
    let addedInLastPass = true;
    while (selected.length < FEATURED_TARGET_COUNT && addedInLastPass) {
      addedInLastPass = false;
      for (const key of sectionKeys) {
        if (selected.length >= FEATURED_TARGET_COUNT) break;
        if (takeNextFrom(key)) addedInLastPass = true;
      }
    }

    return selected;
  }, [products]);

  const updateCarouselScrollState = useCallback(() => {
    const el = carouselRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    updateCarouselScrollState();
  }, [featuredProducts, updateCarouselScrollState]);

  const handleCarouselScroll = useCallback((direction: "left" | "right") => {
    const el = carouselRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.85;
    el.scrollBy({ left: direction === "left" ? -amount : amount, behavior: "smooth" });
  }, []);

  // Auto-avance del carrusel: cada pocos segundos avanza solo una "página",
  // y al llegar al final vuelve al inicio en vez de quedarse trabado ahí.
  // Se pausa mientras el usuario interactúa (mouse encima o toque) para no
  // pelearle el scroll a alguien que está mirando un producto, y respeta la
  // preferencia de "reducir movimiento" del sistema para accesibilidad.
  const AUTOPLAY_INTERVAL_MS = 4500;
  const isInteractingRef = useRef(false);

  const pauseAutoplay = useCallback(() => {
    isInteractingRef.current = true;
  }, []);

  const resumeAutoplay = useCallback(() => {
    isInteractingRef.current = false;
  }, []);

  useEffect(() => {
    const el = carouselRef.current;
    if (!el || featuredProducts.length === 0) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const id = window.setInterval(() => {
      if (isInteractingRef.current) return;

      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4;
      if (atEnd) {
        el.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        el.scrollBy({ left: el.clientWidth * 0.85, behavior: "smooth" });
      }
    }, AUTOPLAY_INTERVAL_MS);

    return () => window.clearInterval(id);
  }, [featuredProducts]);

  const handleAddToCart = useCallback((product: Product) => {
    addToCart({
      id: product.id,
      name: product.nombre,
      price: getEffectivePrice(product.precio, product.precio_oferta),
      image: product.image || "/placeholder-product.png",
    });
  }, [addToCart]);

  const handleNavigate = useCallback((id: string) => {
    navigate(`/product/${id}`, { state: { from: '/' } });
  }, [navigate]);

  return (
    <div className="home">
      <RoutePrefetcher />

      <section className="hero-wrapper">
        <div className="hero">
          <img
            src="/HomeImage.jpeg"
            alt="Cyber Hero"
            className="hero-image"
            loading="eager"
          />

          <div className="hero-content">
            <span className="hero-eyebrow">Electrónica · Gaming · Audio · Instrumentos</span>
            <h1>Todo tu setup, en un mismo lugar</h1>
            <p>
              Componentes, periféricos, consolas y equipo musical con garantía
              real y entrega rápida en Puntarenas.
            </p>
            <div className="hero-actions">
              <Link to="/catalogo" className="hero-cta-primary">
                Ver catálogo
              </Link>
              <Link to="/descuentos" className="hero-cta-secondary">
                Ver descuentos
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="trust-strip">
        {TRUST_BADGES.map((badge) => (
          <div className="trust-item" key={badge.title}>
            <span className="trust-icon">{badge.icon}</span>
            <div>
              <strong>{badge.title}</strong>
              <p>{badge.text}</p>
            </div>
          </div>
        ))}
      </section>

      <section className="products-section">
        <h2 className="section-title">Productos destacados</h2>

        {loading ? (
          <div className="products-carousel">
            {Array.from({ length: 5 }).map((_, index) => (
              <ProductCardSkeleton key={index} />
            ))}
          </div>
        ) : featuredProducts.length === 0 ? (
          <p className="empty-state-text">No hay productos disponibles.</p>
        ) : (
          <div
            className="products-carousel-wrapper"
            onMouseEnter={pauseAutoplay}
            onMouseLeave={resumeAutoplay}
            onTouchStart={pauseAutoplay}
            onTouchEnd={resumeAutoplay}
          >
            <CarouselArrow
              direction="left"
              onClick={() => handleCarouselScroll("left")}
              disabled={!canScrollLeft}
            />

            <div
              className="products-carousel"
              ref={carouselRef}
              onScroll={updateCarouselScrollState}
            >
              {featuredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onAddToCart={handleAddToCart}
                  onNavigate={handleNavigate}
                />
              ))}
            </div>

            <CarouselArrow
              direction="right"
              onClick={() => handleCarouselScroll("right")}
              disabled={!canScrollRight}
            />
          </div>
        )}
      </section>
    </div>
  );
};

export default memo(Home);
