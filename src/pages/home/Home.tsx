import "./Home.css";
import { useEffect, useState, useCallback, memo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  HiOutlineTruck,
  HiOutlineShieldCheck,
  HiOutlineCreditCard,
  HiOutlineChatBubbleLeftRight,
} from "react-icons/hi2";
import { FaShoppingCart } from "react-icons/fa";
import { useCart } from "../../context/CartContext";
import productService, { getEffectivePrice, isOnSale } from "../../services/productService";
import RoutePrefetcher from "../../components/RoutePrefetcher";
import { formatPrice } from "../../utils/format";

type ProductType = {
  tipo: string;
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

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);

        const response = await productService.getProducts({
          page: 1,
          limit: 10,
        });

        const rawProducts = response.data;

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
          <div className="products-grid">
            {Array.from({ length: 5 }).map((_, index) => (
              <ProductCardSkeleton key={index} />
            ))}
          </div>
        ) : products.length === 0 ? (
          <p className="empty-state-text">No hay productos disponibles.</p>
        ) : (
          <div className="products-grid">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onAddToCart={handleAddToCart}
                onNavigate={handleNavigate}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default memo(Home);
