import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import productService, { getEffectivePrice, isOnSale } from "../../../services/productService";
import { formatPrice } from "../../../utils/format";
import "./Descuentos.css";

type ProductOffer = {
  id: string;
  nombre: string;
  marca: string;
  image: string;
  precioOriginal: number;
  precioFinal: number;
  porcentaje: number;
};

const Discounts = () => {
  const [offers, setOffers] = useState<ProductOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadOffers = async () => {
      try {
        setLoading(true);
        setError(null);

        const result = await productService.getProducts({ page: 1, limit: 200 });

        const onSaleProducts = result.data
          .filter((p) => p.available !== false && isOnSale(p.precio, p.precio_oferta))
          .map((p) => {
            const precioOriginal = Number(p.precio);
            const precioFinal = getEffectivePrice(p.precio, p.precio_oferta);

            return {
              id: p.id,
              nombre: p.nombre,
              marca: p.marca,
              image: p.image || "/placeholder-product.png",
              precioOriginal,
              precioFinal,
              porcentaje: Math.round(
                ((precioOriginal - precioFinal) / precioOriginal) * 100
              ),
            };
          })
          .sort((a, b) => b.porcentaje - a.porcentaje);

        setOffers(onSaleProducts);
      } catch (err) {
        console.error("Error cargando descuentos:", err);
        setError("No se pudieron cargar los descuentos. Por favor, intenta más tarde.");
      } finally {
        setLoading(false);
      }
    };

    loadOffers();
  }, []);

  if (loading) {
    return (
      <div className="discounts-page">
        <div className="discounts-header">
          <h1>Descuentos</h1>
          <p>Cargando productos en oferta...</p>
        </div>
        <div className="loading-state">
          <div className="loading-spinner"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="discounts-page">
        <div className="discounts-header">
          <h1>Descuentos</h1>
          <p>{error}</p>
        </div>
        <div className="error-state">
          <button onClick={() => window.location.reload()} className="retry-btn">
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="discounts-page">
      <div className="discounts-header">
        <h1>Descuentos</h1>
        <p>Productos con precio especial por tiempo limitado.</p>
      </div>

      <div className="discounts-highlight">
        <div className="discounts-banner">
          <h2>Ofertas activas</h2>
          <p>Estos productos ya tienen el descuento aplicado.</p>
        </div>
      </div>

      {offers.length === 0 ? (
        <div className="no-discounts">
          <h3>No hay productos en descuento actualmente</h3>
          <p>Vuelve pronto para encontrar nuevas promociones.</p>
        </div>
      ) : (
        <div className="discounts-grid">
          {offers.map((offer) => (
            <Link
              to={`/product/${offer.id}`}
              state={{ from: "/descuentos" }}
              className="discount-card"
              key={offer.id}
            >
              <div className="discount-badge">-{offer.porcentaje}%</div>

              <div className="discount-image">
                <img
                  src={offer.image}
                  alt={offer.nombre}
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src =
                      "/placeholder-product.png";
                  }}
                />
              </div>

              <div className="discount-info">
                <p className="discount-brand">{offer.marca}</p>
                <h3>{offer.nombre}</h3>

                <div className="discount-prices">
                  <span className="old-price">
                    {formatPrice(offer.precioOriginal)}
                  </span>
                  <span className="new-price">
                    {formatPrice(offer.precioFinal)}
                  </span>
                </div>

                <div className="discount-actions">
                  <span className="discount-btn">Ver producto</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default Discounts;
