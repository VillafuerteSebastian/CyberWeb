import { useEffect, useState } from "react";
import orderService from "../../../services/orderService";
import { formatPrice } from "../../../utils/format";
import "../Perfil/Profile.css";

type ProductoPedido = {
  product_id: string;
  nombre: string;
  precio_unitario: number;
  cantidad: number;
  subtotal: number;
};

type Pedido = {
  id: string;
  order_number?: number;
  user_id: string;
  productos: ProductoPedido[];
  total: number;
  status: string;
  payment_status: string;
  created_at: string;
  updated_at: string;
};

const PedidosPage = () => {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchPedidos = async () => {
      try {
        setLoading(true);
        setError("");

        const ordenes = await orderService.getMyOrders();

        const pedidosData: Pedido[] = ordenes.map((orden) => ({
          id: orden.id,
          order_number: orden.order_number,
          user_id: orden.user_id,
          productos: (orden.orden_items || []).map((item) => ({
            product_id: item.product_id || "",
            nombre: item.nombre,
            precio_unitario: item.precio_unitario,
            cantidad: item.cantidad,
            subtotal: item.subtotal,
          })),
          total: orden.total,
          status: orden.status,
          payment_status: orden.payment_status,
          created_at: orden.created_at,
          updated_at: orden.updated_at,
        }));

        setPedidos(pedidosData);
      } catch (err: any) {
        setError(err?.message || "Error al obtener los pedidos");
      } finally {
        setLoading(false);
      }
    };

    fetchPedidos();
  }, []);

  const formatDate = (dateString: string) => {
    if (!dateString) return "-";

    const date = new Date(dateString);

    if (isNaN(date.getTime())) return "-";

    return date.toLocaleString("es-CR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getEstadoLabel = (status: string) => {
    if (!status) return "-";

    switch (status) {
      case "PENDING":
        return "Pendiente";
      case "ACCEPTED":
        return "Aceptado";
      case "PAID":
        return "Pagado";
      case "PROCESSING":
        return "Procesando";
      case "SHIPPED":
        return "Enviado";
      case "DELIVERED":
        return "Entregado";
      case "CANCELLED":
        return "Cancelado";
      default:
        return status;
    }
  };

  const getPaymentStatusLabel = (paymentStatus: string) => {
    if (!paymentStatus) return "-";

    switch (paymentStatus) {
      case "PENDING":
        return "Pendiente";
      case "PAID":
        return "Pagado";
      case "REJECTED":
        return "Rechazado";
      default:
        return paymentStatus;
    }
  };

  return (
    <div className="account-section-page">
      <h1>Mis pedidos</h1>

      <p>
        Aquí podrás ver el historial de compras realizadas en nuestra tienda.
      </p>

      {loading ? (
        <div className="empty-state">
          <h3>Cargando pedidos...</h3>
        </div>
      ) : error ? (
        <div className="empty-state">
          <h3>Error al cargar pedidos</h3>
          <p>{error}</p>
        </div>
      ) : pedidos.length === 0 ? (
        <div className="empty-state">
          <h3>No tienes pedidos todavía</h3>
          <p>Cuando realices tu primera compra aparecerá aquí.</p>
        </div>
      ) : (
        <div className="orders-cards-list">
          {pedidos.map((pedido) => (
            <div key={pedido.id} className="order-card">
              <div className="order-card-top">
                <span className="order-card-id">
                  #{pedido.order_number ?? pedido.id}
                </span>
                <span className="order-card-date">{formatDate(pedido.created_at)}</span>
                <span
                  className={`order-status-badge ${pedido.status.toLowerCase()}`}
                >
                  {getEstadoLabel(pedido.status)}
                </span>
              </div>

              <ul className="order-card-items">
                {(pedido.productos || []).map((item, index) => (
                  <li key={`${pedido.id}-${index}`}>
                    <span>{item.nombre}</span>
                    <span>x{item.cantidad}</span>
                  </li>
                ))}
              </ul>

              <div className="order-card-bottom">
                <span className="order-card-total">
                  {formatPrice(Number(pedido.total || 0))}
                </span>
                <span className="order-card-payment">
                  Pago: {getPaymentStatusLabel(pedido.payment_status)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PedidosPage;