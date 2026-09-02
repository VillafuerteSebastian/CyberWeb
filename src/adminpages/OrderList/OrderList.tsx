import { useEffect, useMemo, useState } from "react";
import orderService from "../../services/orderService";
import { formatPrice } from "../../utils/format";
import "./OrderList.css";

type OrderItem = {
  id: string | number;
  name: string;
  price: number;
  quantity: number;
  image: string;
  available?: boolean | null;
};

type DeliveryMethod = "pickup" | "shipping";

type Order = {
  id: string | number;
  orderNumber?: number;
  customerName: string;
  customerEmail: string;
  phone?: string;
  address?: string;
  date: string;
  items: OrderItem[];
  total: number;
  status: "pending" | "accepted" | "shipped" | "cancelled";
  motivo?: string;
  deliveryMethod?: DeliveryMethod;
};

const AdminOrders = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [reason, setReason] = useState("");
  const [filter, setFilter] = useState<
    "all" | "pending" | "accepted" | "shipped" | "cancelled"
  >("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const mapStatus = (status: string): Order["status"] => {
    switch ((status || "").toUpperCase()) {
      case "ACCEPTED":
        return "accepted";
      case "SHIPPED":
        return "shipped";
      case "CANCELLED":
        return "cancelled";
      default:
        return "pending";
    }
  };

  const mapDeliveryMethod = (value?: string): DeliveryMethod => {
    const normalized = (value || "").toLowerCase();
    if (normalized === "nearby" || normalized === "correos") return "shipping";
    return "pickup";
  };

  const fetchOrders = async () => {
    try {
      setLoading(true);

      const ordenes = await orderService.getAllOrders();

      const normalized: Order[] = ordenes.map((order) => ({
        id: order.id,
        orderNumber: order.order_number,
        customerName: order.customer_name || "Cliente",
        customerEmail: order.customer_email || "No disponible",
        phone: order.phone || "",
        address: order.address || "",
        date: order.created_at || "",
        total: Number(order.total || 0),
        status: mapStatus(order.status),
        motivo: order.motivo || "",
        deliveryMethod: mapDeliveryMethod(order.delivery_method || undefined),
        items: (order.orden_items || []).map((item) => ({
          id: item.id,
          name: item.nombre,
          price: Number(item.precio_unitario || 0),
          quantity: Number(item.cantidad || 0),
          image: "/logo.png",
          available:
            item.available === true || item.available === false
              ? item.available
              : null,
        })),
      }));

      setOrders(normalized);

      setSelectedOrder((prev) => {
        if (!normalized.length) return null;
        if (!prev) return normalized[0];
        return normalized.find((o) => String(o.id) === String(prev.id)) || normalized[0];
      });
    } catch (error: any) {
      alert(error?.message || "Error al cargar pedidos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const filteredOrders = useMemo(() => {
    if (filter === "all") return orders;
    return orders.filter((order) => order.status === filter);
  }, [orders, filter]);

  const getStatusInfo = (status: Order["status"]) => {
    switch (status) {
      case "accepted":
        return { text: "Aceptado", className: "accepted" };
      case "shipped":
        return { text: "Enviado", className: "shipped" };
      case "cancelled":
        return { text: "Cancelado", className: "rejected" };
      default:
        return { text: "Pendiente", className: "pending" };
    }
  };

  const updateLocalOrder = (orderId: string | number, updater: (order: Order) => Order) => {
    setOrders((prev) => prev.map((order) => String(order.id) === String(orderId) ? updater(order) : order));
    setSelectedOrder((prev) =>
      prev && String(prev.id) === String(orderId) ? updater(prev) : prev
    );
  };

  const updateOrderStatus = async (
    orderId: string | number,
    newStatus: Order["status"],
    extraData: Partial<Order> = {}
  ) => {
    try {
      setSaving(true);

      const backendStatus =
        newStatus === "accepted"
          ? "ACCEPTED"
          : newStatus === "shipped"
          ? "SHIPPED"
          : newStatus === "cancelled"
          ? "CANCELLED"
          : "PENDING";

      await orderService.updateOrderStatus(
        String(orderId),
        backendStatus,
        extraData.motivo || null
      );

      updateLocalOrder(orderId, (order) => ({
        ...order,
        status: newStatus,
        ...extraData,
      }));
    } catch (error: any) {
      alert(error?.message || "Error al actualizar pedido");
    } finally {
      setSaving(false);
    }
  };

  const updateItemAvailability = async (
    orderId: string | number,
    itemId: string | number,
    available: boolean
  ) => {
    try {
      setSaving(true);

      await orderService.updateItemsAvailability({
        [String(itemId)]: available,
      });

      updateLocalOrder(orderId, (currentOrder) => ({
        ...currentOrder,
        items: currentOrder.items.map((item) =>
          String(item.id) === String(itemId) ? { ...item, available } : item
        ),
      }));
    } catch (error: any) {
      alert(error?.message || "Error al actualizar disponibilidad");
    } finally {
      setSaving(false);
    }
  };

  const handleAccept = () => {
    if (!selectedOrder) return;
    updateOrderStatus(selectedOrder.id, "accepted");
  };

  const handleShipped = () => {
    if (!selectedOrder) return;
    updateOrderStatus(selectedOrder.id, "shipped");
  };

  const handleCancel = () => {
    if (!selectedOrder) return;
    updateOrderStatus(selectedOrder.id, "cancelled");
  };

  const handleConfirmReject = () => {
    if (!selectedOrder) return;

    if (!reason.trim()) {
      alert("Debes escribir un motivo de cancelación.");
      return;
    }

    updateOrderStatus(selectedOrder.id, "cancelled", {
      motivo: reason.trim(),
    });

    setShowRejectModal(false);
    setReason("");
  };

  const formatPhoneForWhatsApp = (phone?: string) => {
    if (!phone) return "";
    const cleaned = phone.replace(/\D/g, "");
    if (!cleaned) return "";
    if (cleaned.startsWith("506")) return cleaned;
    return `506${cleaned}`;
  };

  const paymentMethodsText = `Métodos de pago disponibles:
- SINPE Móvil
- Transferencia bancaria
- Efectivo contra entrega (si aplica)

Por favor envíanos el comprobante para coordinar el envío.`;

  const displayOrderId = (order: Order) => order.orderNumber ?? order.id;

  const buildPendingMessage = (order: Order) => {
    const availableItems = order.items.filter((item) => item.available === true);
    const unavailableItems = order.items.filter((item) => item.available === false);
    const pendingItems = order.items.filter(
      (item) => item.available !== true && item.available !== false
    );

    let message = `Hola ${order.customerName}, te escribimos sobre tu pedido #${displayOrderId(order)}.`;

    if (availableItems.length > 0) {
      message += `\n\n✅ Productos disponibles:\n`;
      availableItems.forEach((item) => {
        message += `- ${item.name} (cant: ${item.quantity})\n`;
      });
    }

    if (unavailableItems.length > 0) {
      message += `\n❌ Productos no disponibles:\n`;
      unavailableItems.forEach((item) => {
        message += `- ${item.name} (cant: ${item.quantity})\n`;
      });
    }

    if (pendingItems.length > 0) {
      message += `\n⏳ Productos aún sin revisar:\n`;
      pendingItems.forEach((item) => {
        message += `- ${item.name} (cant: ${item.quantity})\n`;
      });
    }

    message += `\nQuedamos atentos para coordinar contigo.`;
    return message;
  };

  const buildAcceptedMessage = (order: Order) => {
    let message = `Hola ${order.customerName}, tu pedido #${displayOrderId(order)} fue aceptado correctamente.`;

    message += `\n\nResumen del pedido:\n`;
    order.items.forEach((item) => {
      message += `- ${item.name} (cant: ${item.quantity})\n`;
    });

    message += `\nTotal: ${formatPrice(order.total)}`;

    if (order.deliveryMethod === "shipping") {
      message += `\n\nSeleccionaste envío a domicilio.`;
      message += `\n${paymentMethodsText}`;
    } else {
      message += `\n\nSeleccionaste retiro en tienda.`;
    }

    message += `\n\nQuedamos atentos.`;
    return message;
  };

  const buildShippedMessage = (order: Order) => {
    let message = `Hola ${order.customerName}, te confirmamos que tu pedido #${displayOrderId(order)} ya fue enviado.`;

    if (order.deliveryMethod === "shipping") {
      message += `\n\nTu envío va en camino a la dirección registrada: ${
        order.address || "sin dirección registrada"
      }.`;
    } else {
      message += `\n\nTu pedido ya está listo según la coordinación realizada.`;
    }

    message += `\n\nGracias por comprar con nosotros.`;
    return message;
  };

  const handleSendWhatsApp = () => {
    if (!selectedOrder) return;

    const phone = formatPhoneForWhatsApp(selectedOrder.phone);

    if (!phone) {
      alert("Este pedido no tiene un número de teléfono válido.");
      return;
    }

    let message = "";

    if (selectedOrder.status === "pending") {
      message = buildPendingMessage(selectedOrder);
    } else if (selectedOrder.status === "accepted") {
      message = buildAcceptedMessage(selectedOrder);
    } else if (selectedOrder.status === "shipped") {
      message = buildShippedMessage(selectedOrder);
    } else {
      return;
    }

    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  };

  const canSendWhatsapp =
    selectedOrder?.status === "pending" ||
    selectedOrder?.status === "accepted" ||
    selectedOrder?.status === "shipped";

  const whatsappButtonText =
    selectedOrder?.status === "pending"
      ? "Enviar disponibilidad"
      : selectedOrder?.status === "accepted"
      ? "Enviar pedido aceptado"
      : selectedOrder?.status === "shipped"
      ? "Enviar pedido enviado"
      : "";

  const totalOrders = orders.length;
  const totalPending = orders.filter((order) => order.status === "pending").length;
  const totalAccepted = orders.filter((order) => order.status === "accepted").length;
  const totalShipped = orders.filter((order) => order.status === "shipped").length;
  const totalCancelled = orders.filter((order) => order.status === "cancelled").length;

  const formatDate = (date: string) => {
    if (!date) return "Sin fecha";
    const parsed = new Date(date);
    if (isNaN(parsed.getTime())) return date;

    return parsed.toLocaleString("es-CR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <>
      <div className={`orders-admin-page ${showRejectModal || showReasonModal ? "blurred" : ""}`}>
        <div className="orders-admin-container">
          <div className="orders-admin-header">
            <div>
              <h1>Panel de pedidos</h1>
              <p>Administra todos los pedidos de la tienda</p>
            </div>

            <button className="filter-btn" onClick={fetchOrders} type="button">
              {loading ? "Cargando..." : "Recargar"}
            </button>
          </div>

          <div className="orders-summary">
            <div className="summary-card"><span>Total</span><strong>{totalOrders}</strong></div>
            <div className="summary-card"><span>Pendientes</span><strong>{totalPending}</strong></div>
            <div className="summary-card"><span>Aceptados</span><strong>{totalAccepted}</strong></div>
            <div className="summary-card"><span>Enviados</span><strong>{totalShipped}</strong></div>
            <div className="summary-card"><span>Cancelados</span><strong>{totalCancelled}</strong></div>
          </div>

          <div className="orders-filter-bar">
            <button className={filter === "all" ? "filter-btn active" : "filter-btn"} onClick={() => setFilter("all")}>Todos</button>
            <button className={filter === "pending" ? "filter-btn active" : "filter-btn"} onClick={() => setFilter("pending")}>Pendientes</button>
            <button className={filter === "accepted" ? "filter-btn active" : "filter-btn"} onClick={() => setFilter("accepted")}>Aceptados</button>
            <button className={filter === "shipped" ? "filter-btn active" : "filter-btn"} onClick={() => setFilter("shipped")}>Enviados</button>
            <button className={filter === "cancelled" ? "filter-btn active" : "filter-btn"} onClick={() => setFilter("cancelled")}>Cancelados</button>
          </div>

          <div className="orders-layout">
            <aside className="orders-sidebar">
              <h2>Pedidos</h2>

              {loading ? (
                <p className="empty-orders">Cargando pedidos...</p>
              ) : filteredOrders.length === 0 ? (
                <p className="empty-orders">No hay pedidos para este filtro.</p>
              ) : (
                <div className="orders-list">
                  {filteredOrders.map((order) => {
                    const statusInfo = getStatusInfo(order.status);

                    return (
                      <button
                        key={order.id}
                        type="button"
                        className={`order-list-item ${selectedOrder?.id === order.id ? "active" : ""}`}
                        onClick={() => setSelectedOrder(order)}
                      >
                        <div className="order-list-top">
                          <strong>#{displayOrderId(order)}</strong>
                          <span className={`mini-status ${statusInfo.className}`}>
                            {statusInfo.text}
                          </span>
                        </div>

                        <div className="order-list-body">
                          <p>{order.customerName}</p>
                          <small>{formatDate(order.date)}</small>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </aside>

            <main className="ticket-content">
              {!selectedOrder ? (
                <div className="ticket-card">
                  <p>No hay pedido seleccionado.</p>
                </div>
              ) : (
                <>
                  <h2>Información del pedido</h2>
                  <p className="date">
                    Fecha del pedido: {formatDate(selectedOrder.date)}
                  </p>

                  <div className="ticket-card">
                    <div className="ticket-row">
                      <div className="ticket-field">
                        <label>Pedido</label>
                        <div className="value">#{displayOrderId(selectedOrder)}</div>
                      </div>

                      <div className="ticket-field">
                        <label>Cliente</label>
                        <div className="value">{selectedOrder.customerName}</div>
                      </div>

                      <div className="ticket-field">
                        <label>Correo</label>
                        <div className="value">{selectedOrder.customerEmail}</div>
                      </div>
                    </div>

                    <div className="ticket-row">
                      <div className="ticket-field">
                        <label>Teléfono</label>
                        <div className="value">{selectedOrder.phone || "N/A"}</div>
                      </div>

                      <div className="ticket-field">
                        <label>Dirección</label>
                        <div className="value">{selectedOrder.address || "N/A"}</div>
                      </div>

                      <div className="ticket-field">
                        <label>Total</label>
                        <div className="value">{formatPrice(selectedOrder.total)}</div>
                      </div>
                    </div>

                    <div className="ticket-row">
                      <div className="ticket-field">
                        <label>Método de entrega</label>
                        <div className="value">
                          {selectedOrder.deliveryMethod === "shipping" ? "Envío" : "Retiro en tienda"}
                        </div>
                      </div>

                      <div className="ticket-field" style={{ width: "100%" }}>
                        <label>Estado</label>
                        <div className={`status ${getStatusInfo(selectedOrder.status).className}`}>
                          {getStatusInfo(selectedOrder.status).text}

                          {selectedOrder.status === "cancelled" && selectedOrder.motivo && (
                            <button
                              className="note-icon-btn"
                              onClick={() => {
                                setReason(selectedOrder.motivo || "");
                                setShowReasonModal(true);
                              }}
                              title="Ver motivo"
                              type="button"
                            >
                              📝
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="ticket-row">
                      <div className="ticket-field" style={{ width: "100%" }}>
                        <label>Productos del pedido</label>

                        <div className="companions-full">
                          <ul className="order-items-list enhanced">
                            {selectedOrder.items.map((item) => (
                              <li key={`${selectedOrder.id}-${item.id}`}>
                                <div className="order-item-main">
                                  <span>{item.name}</span>
                                  <span>Cant: {item.quantity}</span>
                                  <span>{formatPrice(item.price)}</span>
                                </div>

                                {selectedOrder.status === "pending" ? (
                                  <div className="availability-actions">
                                    <button
                                      type="button"
                                      className={
                                        item.available === true
                                          ? "availability-btn yes active"
                                          : "availability-btn yes"
                                      }
                                      disabled={saving}
                                      onClick={() =>
                                        updateItemAvailability(selectedOrder.id, item.id, true)
                                      }
                                    >
                                      Sí hay
                                    </button>

                                    <button
                                      type="button"
                                      className={
                                        item.available === false
                                          ? "availability-btn no active"
                                          : "availability-btn no"
                                      }
                                      disabled={saving}
                                      onClick={() =>
                                        updateItemAvailability(selectedOrder.id, item.id, false)
                                      }
                                    >
                                      No hay
                                    </button>
                                  </div>
                                ) : (
                                  <div className="availability-status">
                                    {item.available === true && (
                                      <span className="badge-yes">Disponible</span>
                                    )}
                                    {item.available === false && (
                                      <span className="badge-no">Agotado</span>
                                    )}
                                    {(item.available === null || item.available === undefined) && (
                                      <span className="badge-pending">Sin revisar</span>
                                    )}
                                  </div>
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>

                    <div className="ticket-buttons" style={{ justifyContent: "center", gap: "10px" }}>
                      {canSendWhatsapp && (
                        <button className="btn-whatsapp" onClick={handleSendWhatsApp}>
                          {whatsappButtonText}
                        </button>
                      )}

                      {selectedOrder.status === "pending" && (
                        <>
                          <button className="btn-approve" onClick={handleAccept} disabled={saving}>
                            Aprobar
                          </button>
                          <button
                            className="btn-reject"
                            onClick={() => {
                              setReason(selectedOrder.motivo || "");
                              setShowRejectModal(true);
                            }}
                            disabled={saving}
                          >
                            Cancelar pedido
                          </button>
                        </>
                      )}

                      {selectedOrder.status === "accepted" && (
                        <>
                          <button className="btn-approve" onClick={handleShipped} disabled={saving}>
                            Marcar enviado
                          </button>
                          <button className="btn-cancel" onClick={handleCancel} disabled={saving}>
                            Cancelar
                          </button>
                        </>
                      )}

                      {selectedOrder.status === "shipped" && (
                        <button className="btn-back" type="button">
                          Pedido enviado
                        </button>
                      )}

                      {selectedOrder.status === "cancelled" && (
                        <button className="btn-back" type="button">
                          Pedido cancelado
                        </button>
                      )}
                    </div>
                  </div>
                </>
              )}
            </main>
          </div>
        </div>
      </div>

      {showRejectModal && selectedOrder && (
        <div className="modal-overlay">
          <div className="modal">
            <h3 style={{ textAlign: "center" }}>Cancelar pedido ❌</h3>

            <p><strong>Pedido:</strong> #{displayOrderId(selectedOrder)}</p>
            <p><strong>Cliente:</strong> {selectedOrder.customerName}</p>
            <p><strong>Fecha:</strong> {formatDate(selectedOrder.date)}</p>
            <p><strong>Total:</strong> {formatPrice(selectedOrder.total)}</p>

            <label>Motivo de cancelación:</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ingrese el motivo..."
            />

            <div className="modal-buttons">
              <button onClick={() => setShowRejectModal(false)}>Atrás</button>
              <button onClick={handleConfirmReject}>Hecho</button>
            </div>
          </div>
        </div>
      )}

      {showReasonModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Motivo de cancelación</h3>
            <p>{reason}</p>
            <div className="modal-buttons">
              <button onClick={() => setShowReasonModal(false)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AdminOrders;