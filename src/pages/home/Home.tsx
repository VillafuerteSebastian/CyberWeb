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
  HiOutlineShoppingBag,
  HiOutlineTag,
  HiOutlineClock,
} from "react-icons/hi2";
import { FaShoppingCart } from "react-icons/fa";
import { useCart } from "../../context/CartContext";
import productService, { getEffectivePrice, isOnSale } from "../../services/productService";
import RoutePrefetcher from "../../components/RoutePrefetcher";
import { formatPrice } from "../../utils/format";
import {
  categoryData,
  getCategoryData,
  CATEGORIES_UPDATED_EVENT,
} from "../../data/categoryData";
import type { CategoryItem } from "../../data/categoryData";

type ProductType = {
  tipo: string;
};

type ProductCategoriaExtra = {
  categoria: string;
  tipos: ProductType[];
};

// "guitarras-electricas" -> "Guitarras Electricas" — mismo criterio que
// CategoryPage/ProductDetail para mostrar el slug de una subcategoría como
// etiqueta legible sin tener que traer el árbol de categorías completo acá.
const prettifySlug = (value?: string) => {
  if (!value) return "";
  return value
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
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
  // Sin stock propio, se consigue solo por pedido especial.
  porEncargo?: boolean;
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
            <HiOutlineTag aria-hidden="true" />
            -{Math.round(((product.precio - effectivePrice) / product.precio) * 100)}%
          </span>
        )}

        {!isAvailable && (
          <span className="out-of-stock-badge">No disponible</span>
        )}

        {lowStock && (
          <span className="low-stock-badge">¡Últimas {product.stock}!</span>
        )}

        {isAvailable && product.porEncargo && (
          <span className="preorder-ribbon">
            <HiOutlineClock aria-hidden="true" /> Por encargo
          </span>
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
  const [categories, setCategories] = useState<CategoryItem[]>([]);

  const carouselRef = useRef<HTMLDivElement>(null);
  // Qué "cara" del carrusel (qué subcategoría) se está mostrando ahora mismo.
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);

  // Categorías para el bloque "Comprá por categoría": se cargan al montar y
  // se refrescan solas si el admin agrega/edita/borra algo (mismo evento que
  // escucha el Navbar), así nunca queda desactualizado sin recargar.
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const categoriesData = await getCategoryData();
        setCategories(categoriesData);
      } catch (error) {
        console.error("Error al cargar categorías:", error);
        setCategories(categoryData);
      }
    };

    loadCategories();

    window.addEventListener(CATEGORIES_UPDATED_EVENT, loadCategories);
    return () => {
      window.removeEventListener(CATEGORIES_UPDATED_EVENT, loadCategories);
    };
  }, []);

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
          porEncargo: product.por_encargo === true,
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

  // Cuántos productos como máximo se cargan por subcategoría (una "cara"
  // del carrusel). Si la subcategoría tiene menos, se muestran todos los
  // que haya.
  const SECTION_PRODUCT_COUNT = 10;

  // Una sección = una subcategoría, con hasta SECTION_PRODUCT_COUNT
  // productos de esa subcategoría. Cada "cara" del carrusel (cada vez que
  // se pasa con la flecha o el auto-avance) muestra una sección distinta,
  // en vez de una sola lista mezclada de productos de todas las
  // subcategorías a la vez. Un producto puede aparecer en más de una
  // sección si además está listado en categorías adicionales
  // (`categorias_extra`).
  type FeaturedSection = { key: string; label: string; products: Product[] };

  const featuredSections = useMemo<FeaturedSection[]>(() => {
    const buckets = new Map<string, FeaturedSection>();

    const addToBucket = (categoria: string, subcategoria: string, product: Product) => {
      if (!categoria) return;
      const key = `${categoria}::${subcategoria || "general"}`;
      let bucket = buckets.get(key);
      if (!bucket) {
        bucket = {
          key,
          label: prettifySlug(subcategoria || categoria),
          products: [],
        };
        buckets.set(key, bucket);
      }
      if (
        bucket.products.length < SECTION_PRODUCT_COUNT &&
        !bucket.products.some((p) => p.id === product.id)
      ) {
        bucket.products.push(product);
      }
    };

    products.forEach((product) => {
      addToBucket(product.categoria, product.tipos[0]?.tipo || "", product);
      product.categorias_extra.forEach((extra) => {
        addToBucket(extra.categoria, extra.tipos?.[0]?.tipo || "", product);
      });
    });

    return Array.from(buckets.values())
      .filter((section) => section.products.length > 0)
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [products]);

  // Si el catálogo cambia (recarga, admin agrega/borra) y la cara actual ya
  // no existe, vuelve a la primera en vez de quedar apuntando a un índice
  // vacío.
  useEffect(() => {
    if (currentSectionIndex >= featuredSections.length) {
      setCurrentSectionIndex(0);
    }
  }, [featuredSections, currentSectionIndex]);

  const currentSection = featuredSections[currentSectionIndex];
  const canPageSections = featuredSections.length > 1;

  const goToSection = useCallback(
    (direction: "left" | "right") => {
      setCurrentSectionIndex((prev) => {
        const count = featuredSections.length;
        if (count === 0) return 0;
        return direction === "left"
          ? (prev - 1 + count) % count
          : (prev + 1) % count;
      });
    },
    [featuredSections.length]
  );

  // Cada vez que cambia la cara, el carrusel arranca desde el principio en
  // vez de conservar el scroll horizontal de la sección anterior.
  useEffect(() => {
    carouselRef.current?.scrollTo({ left: 0 });
  }, [currentSectionIndex]);

  // Auto-avance: cada pocos segundos pasa a la siguiente subcategoría. Se
  // pausa mientras el usuario interactúa (mouse encima o toque) para no
  // cambiarle la cara mientras está mirando un producto, y respeta la
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
    if (!canPageSections) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const id = window.setInterval(() => {
      if (isInteractingRef.current) return;
      goToSection("right");
    }, AUTOPLAY_INTERVAL_MS);

    return () => window.clearInterval(id);
  }, [canPageSections, goToSection]);

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

      {(categories.length > 0 ? categories : categoryData).length > 0 && (
        <section className="shop-by-category">
          <div className="section-header">
            <div className="section-header-text">
              <span className="section-kicker">Catálogo</span>
              <h2 className="section-title">Comprá por categoría</h2>
            </div>
            <Link to="/catalogo" className="section-link">
              Ver todo el catálogo →
            </Link>
          </div>

          <div className="category-grid">
            {(categories.length > 0 ? categories : categoryData).map((cat) => (
              <Link
                key={cat.id}
                to={`/catalogo?categoria=${cat.id}`}
                className="category-tile"
              >
                <span className="category-tile-icon">{cat.icon}</span>
                <span className="category-tile-name">{cat.name}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="trust-strip">
        <div className="trust-strip-inner">
          {TRUST_BADGES.map((badge) => (
            <div className="trust-item" key={badge.title}>
              <span className="trust-icon">{badge.icon}</span>
              <div>
                <strong>{badge.title}</strong>
                <p>{badge.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="products-section">
        <div className="section-header">
          <div className="section-header-text">
            <span className="section-kicker">
              {currentSection?.label || "Más vendidos"}
            </span>
            <h2 className="section-title">Productos destacados</h2>
          </div>
          <Link to="/catalogo" className="section-link">
            Ver todo el catálogo →
          </Link>
        </div>

        {loading ? (
          <div className="products-carousel">
            {Array.from({ length: 5 }).map((_, index) => (
              <ProductCardSkeleton key={index} />
            ))}
          </div>
        ) : !currentSection ? (
          <div className="empty-state">
            <span className="empty-state-icon">
              <HiOutlineShoppingBag aria-hidden="true" />
            </span>
            <h3>No hay productos disponibles</h3>
            <p>Volvé más tarde, estamos actualizando el catálogo.</p>
          </div>
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
              onClick={() => goToSection("left")}
              disabled={!canPageSections}
            />

            <div className="products-carousel" ref={carouselRef}>
              {currentSection.products.map((product) => (
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
              onClick={() => goToSection("right")}
              disabled={!canPageSections}
            />
          </div>
        )}
      </section>
    </div>
  );
};

export default memo(Home);
