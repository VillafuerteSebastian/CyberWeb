import { Link, useParams, useLocation } from "react-router-dom";
import { useCart } from "../../context/CartContext";
import { useEffect, useState } from "react";
import productService, { getEffectivePrice, isOnSale } from "../../services/productService";
import { formatPrice } from "../../utils/format";
import "./ProductDetail.css";

type ProductType = {
  tipo: string;
};

type VarianteProducto = {
  nombre: string;
  valor: string;
  precio_adicional?: number;
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
  image?: string;
  images: string[];
  bullets: string[];
  variantes: VarianteProducto[];
  available?: boolean;
};

type SimilarProduct = {
  id: string;
  nombre: string;
  precio: number;
  precio_oferta?: number | null;
  marca: string;
  image?: string;
};

const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { addToCart } = useCart();
  const location = useLocation();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [varianteSeleccionada, setVarianteSeleccionada] =
    useState<VarianteProducto | null>(null);
  const [showAllBullets, setShowAllBullets] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [similarProducts, setSimilarProducts] = useState<SimilarProduct[]>([]);
  const [loadingSimilar, setLoadingSimilar] = useState(false);

  const BULLETS_COLLAPSED_COUNT = 6;

  // Función para obtener la URL de retorno correcta
  const getBackUrl = () => {
    // 1. Prioridad máxima: estado de navegación pasado
    if (location.state?.from) {
      return location.state.from;
    }
    
    // 2. Si hay parámetros de búsqueda en la URL actual
    const searchParams = new URLSearchParams(location.search);
    if (searchParams.toString()) {
      return `/catalogo?${searchParams.toString()}`;
    }
    
    // 3. Verificar si hay referer válido (evitar bucles con descuentos)
    if (document.referrer && document.referrer.includes(window.location.origin)) {
      // Evitar volver a descuentos desde ProductDetail
      if (!document.referrer.includes('/descuentos')) {
        return document.referrer;
      }
    }
    
    // 4. Revisar sessionStorage para última página visitada
    const lastPage = sessionStorage.getItem('lastVisitedPage');
    if (lastPage && !lastPage.includes('/descuentos')) {
      return lastPage;
    }
    
    // 5. Por defecto, volver al home (no al catálogo)
    return "/";
  };

  // Función para formatear texto con saltos de línea
  const formatTextWithLineBreaks = (text: string) => {
    return text.split('\n').map((line, index) => (
      <span key={index}>
        {line}
        {index < text.split('\n').length - 1 && <br />}
      </span>
    ));
  };

  // Bullets de tipo "Radiador: 240mm" se muestran con la etiqueta en negrita,
  // igual que las fichas técnicas de otras tiendas.
  const formatBulletText = (text: string) => {
    const match = text.match(/^([^:]{2,40}):\s+(.+)$/);
    if (match) {
      const [, label, value] = match;
      return (
        <>
          <strong className="pd-bullet-label">{label}:</strong>{" "}
          {formatTextWithLineBreaks(value)}
        </>
      );
    }
    return formatTextWithLineBreaks(text);
  };

  // "computadoras" / "tarjetas-madre" -> "Computadoras" / "Tarjetas Madre"
  const formatTagLabel = (value: string) =>
    value
      .replace(/-/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());

  useEffect(() => {
    // Guardar página actual antes de cargar el producto
    sessionStorage.setItem('lastVisitedPage', location.pathname + location.search);
    
    const fetchProduct = async () => {
      if (!id) {
        setError("ID de producto no válido");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const productData = await productService.getProductById(id);

        if (!productData) {
          setError("Producto no encontrado");
          setProduct(null);
          return;
        }

        const galleryImages =
          productData.images && productData.images.length > 0
            ? productData.images
            : [productData.image || "/placeholder-product.png"];

        setProduct({
          id: productData.id,
          nombre: productData.nombre,
          descripcion: productData.descripcion,
          precio: productData.precio,
          precio_oferta:
            productData.precio_oferta !== null && productData.precio_oferta !== undefined
              ? Number(productData.precio_oferta)
              : null,
          categoria: productData.categoria,
          marca: productData.marca,
          tipos: productData.tipos || [],
          image: productData.image || "/placeholder-product.png",
          images: galleryImages,
          bullets: productData.bullets || [],
          variantes: productData.variantes || [],
          available: productData.available !== false,
        });
        setActiveImageIndex(0);
      } catch (err) {
        console.error("Error al cargar el producto:", err);
        setError("No se pudo cargar el producto");
        setProduct(null);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id, location.pathname, location.search]);

  // Productos similares: misma categoría, sin incluir el producto actual.
  useEffect(() => {
    if (!product?.categoria) {
      setSimilarProducts([]);
      return;
    }

    let cancelado = false;

    const fetchSimilares = async () => {
      try {
        setLoadingSimilar(true);

        const response = await productService.getProducts({
          page: 1,
          limit: 8,
          categoria: product.categoria,
        });

        if (cancelado) return;

        const similares = response.data
          .filter((p) => String(p.id) !== String(product.id) && p.available !== false)
          .slice(0, 4)
          .map((p) => ({
            id: String(p.id),
            nombre: p.nombre,
            precio: Number(p.precio ?? 0),
            precio_oferta:
              p.precio_oferta !== null && p.precio_oferta !== undefined
                ? Number(p.precio_oferta)
                : null,
            marca: p.marca || "",
            image: p.image || "/placeholder-product.png",
          }));

        setSimilarProducts(similares);
      } catch (err) {
        console.error("Error al cargar productos similares:", err);
        if (!cancelado) setSimilarProducts([]);
      } finally {
        if (!cancelado) setLoadingSimilar(false);
      }
    };

    fetchSimilares();

    return () => {
      cancelado = true;
    };
  }, [product?.categoria, product?.id]);

  if (loading) {
    return (
      <div className="pd-status-page">
        <h2>Cargando producto...</h2>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="pd-status-page">
        <h2>{error || "Producto no encontrado"}</h2>
        <Link to={getBackUrl()} className="pd-status-back">← Volver</Link>
      </div>
    );
  }

  const isAvailable = product.available !== false;
  const onSale = isOnSale(product.precio, product.precio_oferta);
  const variantAddon = varianteSeleccionada?.precio_adicional ?? 0;
  const precioBase = getEffectivePrice(product.precio, product.precio_oferta);
  const precioFinal = precioBase + variantAddon;
  const precioOriginalFinal = product.precio + variantAddon;
  const descuentoPorcentaje = onSale
    ? Math.round(((product.precio - precioBase) / product.precio) * 100)
    : 0;

  return (
    <div className="pd-page">
      <div className="pd-container">
        <section className="pd-hero">
          <div className="pd-left">
            <div className="pd-imageWrap">
              {onSale && (
                <span className="pd-sale-badge">-{descuentoPorcentaje}%</span>
              )}
              <img
                className="pd-image"
                src={product.images[activeImageIndex] || "/placeholder-product.png"}
                alt={product.nombre}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src =
                    "/placeholder-product.png";
                }}
              />
            </div>

            {product.images.length > 1 && (
              <div className="pd-thumbnails">
                {product.images.map((img, idx) => (
                  <button
                    type="button"
                    key={`${img}-${idx}`}
                    className={`pd-thumbnail ${
                      idx === activeImageIndex ? "pd-thumbnail--active" : ""
                    }`}
                    onClick={() => setActiveImageIndex(idx)}
                  >
                    <img
                      src={img}
                      alt={`${product.nombre} ${idx + 1}`}
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src =
                          "/placeholder-product.png";
                      }}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="pd-right">
            <h1 className="pd-title">{product.nombre}</h1>

            <p className="pd-brand">Marca: {product.marca}</p>

            {product.tipos?.length > 0 && (
              <div className="pd-tags">
                <span className="pd-tag pd-tag--category">
                  {formatTagLabel(product.categoria)}
                </span>
                {product.tipos.map((t, idx) => (
                  <span key={idx} className="pd-tag">
                    {formatTagLabel(t.tipo)}
                  </span>
                ))}
              </div>
            )}

            {!isAvailable && (
              <p className="pd-unavailable-badge">
                Producto no disponible temporalmente
              </p>
            )}

            {product.bullets?.length > 0 && (
              <>
                <ul className="pd-bullets pd-bullets--highlights">
                  {(showAllBullets
                    ? product.bullets
                    : product.bullets.slice(0, BULLETS_COLLAPSED_COUNT)
                  ).map((bullet, idx) => (
                    <li key={idx}>{formatBulletText(bullet)}</li>
                  ))}
                </ul>

                {product.bullets.length > BULLETS_COLLAPSED_COUNT && (
                  <button
                    type="button"
                    className="pd-bullets-toggle"
                    onClick={() => setShowAllBullets((prev) => !prev)}
                  >
                    {showAllBullets
                      ? "Ver menos"
                      : `Ver más (${product.bullets.length - BULLETS_COLLAPSED_COUNT})`}
                  </button>
                )}
              </>
            )}

            {product.variantes?.length > 0 && (
              <div className="pd-variantes">
                <p style={{ fontWeight: 600, marginBottom: "0.5rem" }}>
                  Variantes:
                </p>
                <div className="pd-variantes-grid">
                  {product.variantes.map((variante, idx) => (
                    <button
                      key={idx}
                      className={`pd-variante-btn ${
                        varianteSeleccionada?.nombre === variante.nombre &&
                        varianteSeleccionada?.valor === variante.valor
                          ? "pd-variante-btn--active"
                          : ""
                      }`}
                      onClick={() =>
                        setVarianteSeleccionada(
                          varianteSeleccionada?.nombre === variante.nombre &&
                            varianteSeleccionada?.valor === variante.valor
                            ? null
                            : variante
                        )
                      }
                    >
                      {variante.nombre && (
                        <span className="pd-variante-nombre">
                          {variante.nombre}:
                        </span>
                      )}{" "}
                      {variante.valor}
                      {variante.precio_adicional
                        ? ` (+${formatPrice(variante.precio_adicional)})`
                        : ""}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="pd-price-block">
              {onSale && (
                <div className="pd-price-old">
                  {formatPrice(precioOriginalFinal)}
                </div>
              )}
              <div className="pd-price">
                {formatPrice(precioFinal)}
              </div>
              <span className="pd-price-note">
                IVA incluido
                {onSale && ` · Ahorrás ${formatPrice(precioOriginalFinal - precioFinal)}`}
              </span>
            </div>

            <button
              className="pd-btn"
              disabled={!isAvailable}
              onClick={() => {
                if (!isAvailable) return;
                addToCart({
                  id: product.id,
                  name: product.nombre,
                  price: precioFinal,
                  image: product.image || "/placeholder-product.png",
                  variant: varianteSeleccionada
                    ? varianteSeleccionada.nombre
                      ? `${varianteSeleccionada.nombre}: ${varianteSeleccionada.valor}`
                      : varianteSeleccionada.valor
                    : undefined,
                });
              }}
            >
              {isAvailable ? "Agregar al carrito" : "No disponible"}
            </button>

            <div className="pd-back">
              <Link to={getBackUrl()}>← Volver</Link>
            </div>
          </div>
        </section>

        {product.descripcion && (
          <section className="pd-description-card">
            <h2 className="pd-section-title">Descripción</h2>
            <p className="pd-desc">
              {formatTextWithLineBreaks(product.descripcion)}
            </p>
          </section>
        )}

        {!loadingSimilar && similarProducts.length > 0 && (
          <section className="pd-similar-section">
            <h2 className="pd-section-title">Productos similares</h2>

            <div className="pd-similar-grid">
              {similarProducts.map((similar) => {
                const onSaleSimilar = isOnSale(similar.precio, similar.precio_oferta);
                const precioSimilar = getEffectivePrice(similar.precio, similar.precio_oferta);

                return (
                  <Link
                    key={similar.id}
                    to={`/product/${similar.id}`}
                    className="pd-similar-card"
                  >
                    <div className="pd-similar-media">
                      <img
                        src={similar.image || "/placeholder-product.png"}
                        alt={similar.nombre}
                        onError={(e) => {
                          e.currentTarget.src = "/placeholder-product.png";
                        }}
                        loading="lazy"
                      />
                    </div>

                    {similar.marca && (
                      <p className="pd-similar-brand">{similar.marca}</p>
                    )}
                    <h3 className="pd-similar-name">{similar.nombre}</h3>

                    {onSaleSimilar ? (
                      <p className="pd-similar-price">
                        <span className="pd-similar-price-old">
                          {formatPrice(similar.precio)}
                        </span>{" "}
                        {formatPrice(precioSimilar)}
                      </p>
                    ) : (
                      <p className="pd-similar-price">{formatPrice(similar.precio)}</p>
                    )}
                  </Link>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default ProductDetail;