import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../../context/CartContext";
import { useAuth } from "../../context/AuthContext";
import orderService from "../../services/orderService";
import { formatPrice } from "../../utils/format";
import "../../components/Cart/cart.css";

type DeliveryMethod = "store" | "nearby" | "correos" | "";

type Address = {
  direccion: string;
  predeterminada?: boolean;
};

// ✅ NUEVO: Zonas válidas para envío a alrededores
const ZONAS_ALREDEDORES = [
  { value: "puntarenas", label: "Puntarenas Centro" },
  { value: "el_roble",   label: "El Roble" },
  { value: "barranca",   label: "Barranca" },
  { value: "esparza",    label: "Esparza" },
] as const;

type ZonaAlrededores = (typeof ZONAS_ALREDEDORES)[number]["value"] | "";

// ✅ NUEVO: cada zona solo debe mostrar direcciones de ese distrito. Para
// "Puntarenas Centro" se acepta cualquier dirección del cantón de Puntarenas
// que no sea específicamente Barranca, El Roble o Esparza (esas ya tienen su
// propia zona), es decir "centro y cercanías".
const ZONA_KEYWORDS: Record<Exclude<ZonaAlrededores, "">, RegExp> = {
  barranca: /\bbarranca\b/i,
  el_roble: /\broble\b/i,
  esparza: /\besparza\b/i,
  puntarenas: /\bpuntarenas\b/i,
};

const direccionPerteneceAZona = (direccion: string, zona: ZonaAlrededores) => {
  if (!zona) return true;

  if (zona === "puntarenas") {
    return (
      ZONA_KEYWORDS.puntarenas.test(direccion) &&
      !ZONA_KEYWORDS.barranca.test(direccion) &&
      !ZONA_KEYWORDS.el_roble.test(direccion) &&
      !ZONA_KEYWORDS.esparza.test(direccion)
    );
  }

  return ZONA_KEYWORDS[zona].test(direccion);
};

const CartPage = () => {
  const {
    cart,
    removeFromCart,
    increaseQuantity,
    decreaseQuantity,
    clearCart,
  } = useCart();

  const { user, loadUserProfile, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>("");
  const [creatingOrder, setCreatingOrder] = useState(false);

  // ✅ NUEVO: zona seleccionada para "nearby"
  const [zonaSeleccionada, setZonaSeleccionada] = useState<ZonaAlrededores>("");

  const direcciones = useMemo<Address[]>(
    () => user?.direcciones || [],
    [user?.direcciones]
  );

  const direccionPredeterminada =
    direcciones.find((dir) => dir.predeterminada)?.direccion || "";

  // ✅ NUEVO: direcciones guardadas que aplican a la zona de envío elegida
  const direccionesEnZona = useMemo(() => {
    if (deliveryMethod !== "nearby" || !zonaSeleccionada) return direcciones;
    return direcciones.filter((dir) =>
      direccionPerteneceAZona(dir.direccion, zonaSeleccionada)
    );
  }, [direcciones, deliveryMethod, zonaSeleccionada]);

  const [selectedAddress, setSelectedAddress] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [showNewAddressForm, setShowNewAddressForm] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);

  useEffect(() => {
    if (!selectedAddress && direccionPredeterminada) {
      setSelectedAddress(direccionPredeterminada);
    }
  }, [direccionPredeterminada, selectedAddress]);

  const subtotal = cart.reduce(
    (acc, item) => acc + item.price * item.quantity,
    0
  );

  const shippingCost =
    deliveryMethod === "store"
      ? 0
      : deliveryMethod === "nearby"
      ? 3000
      : deliveryMethod === "correos"
      ? 4500
      : 0;

  const total = subtotal + shippingCost;

  const requiresAddress =
    deliveryMethod === "nearby" || deliveryMethod === "correos";

  // ✅ ACTUALIZADO: para "nearby" también requiere zona válida
  const isDeliveryValid =
    deliveryMethod === "store" ||
    (deliveryMethod === "nearby" &&
      zonaSeleccionada !== "" &&
      selectedAddress.trim() !== "" &&
      direccionPerteneceAZona(selectedAddress, zonaSeleccionada)) ||
    (deliveryMethod === "correos" && selectedAddress.trim() !== "");

  const saveAddresses = async (updatedAddresses: Address[]) => {
    try {
      setSavingAddress(true);
      await orderService.updateAddresses(updatedAddresses);
      await loadUserProfile();
    } catch (error: any) {
      const message = error?.message || "Error al guardar la dirección";
      alert(message);
    } finally {
      setSavingAddress(false);
    }
  };

  const handleAddNewAddress = async () => {
    const cleanAddress = newAddress.trim();

    if (!cleanAddress) {
      alert("Debes escribir una dirección");
      return;
    }

    const exists = direcciones.some(
      (dir) => dir.direccion.trim().toLowerCase() === cleanAddress.toLowerCase()
    );

    if (exists) {
      alert("Esa dirección ya existe");
      return;
    }

    // ✅ NUEVO: si hay una zona de "alrededores" activa, la dirección debe
    // mencionar ese distrito para que el envío sea válido.
    if (
      deliveryMethod === "nearby" &&
      zonaSeleccionada &&
      !direccionPerteneceAZona(cleanAddress, zonaSeleccionada)
    ) {
      const zonaLabel =
        ZONAS_ALREDEDORES.find((z) => z.value === zonaSeleccionada)?.label ?? "";
      alert(
        `Esa dirección no parece estar en ${zonaLabel}. Incluye el distrito (${zonaLabel}) en el texto para poder usarla con envío a alrededores.`
      );
      return;
    }

    const updatedAddresses: Address[] = [
      ...direcciones,
      {
        direccion: cleanAddress,
        predeterminada: direcciones.length === 0,
      },
    ];

    await saveAddresses(updatedAddresses);
    setSelectedAddress(cleanAddress);
    setNewAddress("");
    setShowNewAddressForm(false);
  };

  const redirectToLoginPreservingCart = () => {
    localStorage.setItem("postLoginRedirect", "/cart");

    const pendingCheckout = {
      deliveryMethod,
      selectedAddress,
      subtotal,
      shippingCost,
      total,
      createdAt: new Date().toISOString(),
    };

    localStorage.setItem("pendingCheckout", JSON.stringify(pendingCheckout));
    alert("Debes iniciar sesión para finalizar la compra");
    navigate("/login", { state: { from: "/cart" } });
  };

  const handleCreateOrder = async () => {
    if (!isAuthenticated || !user) {
      redirectToLoginPreservingCart();
      return;
    }

    if (cart.length === 0) {
      alert("Tu carrito está vacío");
      return;
    }

    if (!deliveryMethod) {
      alert("Debes seleccionar un método de entrega");
      return;
    }

    // ✅ NUEVO: validación de zona para "nearby"
    if (deliveryMethod === "nearby" && !zonaSeleccionada) {
      alert("Debes seleccionar una zona de entrega válida");
      return;
    }

    if (requiresAddress && !selectedAddress.trim()) {
      alert("Debes seleccionar una dirección de entrega");
      return;
    }

    try {
      setCreatingOrder(true);

      const payload = {
        productos: cart.map((item) => ({
          product_id: item.id,
          cantidad: item.quantity,
        })),
        delivery_method: deliveryMethod,
        // ✅ NUEVO: incluye la zona en el payload cuando aplica
        zona_entrega: deliveryMethod === "nearby" ? zonaSeleccionada : null,
        address: requiresAddress ? selectedAddress : "",
        // El costo de envío ya no se manda: lo calcula el servidor a partir
        // de delivery_method/zona_entrega, para que no se pueda manipular.
      };

      const response = await orderService.createOrder(payload);

      const ordenId = response.order_id;

      const zonaLabel =
        ZONAS_ALREDEDORES.find((z) => z.value === zonaSeleccionada)?.label ?? "";

      const orderSummary = {
        orden_id: ordenId,
        metodo_entrega: deliveryMethod,
        zona_entrega: zonaLabel || null,  // ✅ NUEVO
        direccion_entrega: requiresAddress ? selectedAddress : "Retiro en tienda",
        subtotal,
        envio: shippingCost,
        // Usa el total confirmado por el servidor (RPC create_order), no el
        // estimado localmente, ya que el servidor es quien calcula el envío.
        total: response.total,
        productos: cart.map((item) => ({
          product_id: item.id,
          nombre: item.name,
          cantidad: item.quantity,
          precio_unitario: item.price,
          subtotal: item.price * item.quantity,
          imagen: item.image,
        })),
        created_at: new Date().toISOString(),
      };

      localStorage.setItem("lastOrder", JSON.stringify(orderSummary));
      localStorage.removeItem("pendingCheckout");
      localStorage.removeItem("postLoginRedirect");

      clearCart();
      alert("Orden creada exitosamente");
      navigate("/mi-cuenta/pedidos");
    } catch (error: any) {
      const message = error?.message || "Error al crear la orden";
      alert(message);
    } finally {
      setCreatingOrder(false);
    }
  };

  return (
    <div className="cart-page">
      {cart.length > 0 && <h1 className="cart-title">Carrito de compra</h1>}

      {cart.length === 0 ? (
        <div className="empty-cart-full">
          <div className="empty-cart-content">
            <div className="empty-cart-icon">🛒</div>
            <h2>Tu Carrito Está Vacío.</h2>
            <p>
              Antes de proceder al pago, deberá agregar algunos productos a su
              carrito de compras. Encontrará muchos productos interesantes en
              Extreme Tech.
            </p>
            <Link to="/" className="btn-empty">
              VOLVER A LA TIENDA
            </Link>
          </div>
        </div>
      ) : (
        <div className="cart-layout">
          <div className="cart-products">
            <div className="cart-header">
              <span>PRODUCTO</span>
              <span>PRECIO</span>
              <span>CANTIDAD</span>
              <span>SUBTOTAL</span>
            </div>

            {cart.map((item) => (
              <div key={`${item.id}-${item.variant ?? ""}`} className="cart-row">
                <button
                  className="remove-btn"
                  onClick={() => removeFromCart(item.id, item.variant)}
                  aria-label={`Quitar ${item.name}`}
                >
                  ✕
                </button>

                <div className="product-info">
                  <div className="cart-row-media">
                    <img src={item.image} alt={item.name} />
                  </div>
                  <div className="product-info-text">
                    <span>{item.name}</span>
                    {item.variant && (
                      <span className="cart-item-variant">{item.variant}</span>
                    )}
                  </div>
                </div>

                <div className="cart-field">
                  <span className="cart-field-label">Precio</span>
                  <span className="cart-field-value">{formatPrice(item.price)}</span>
                </div>

                <div className="cart-field">
                  <span className="cart-field-label">Cantidad</span>
                  <div className="quantity-controls">
                    <button onClick={() => decreaseQuantity(item.id, item.variant)}>-</button>
                    <span>{item.quantity}</span>
                    <button onClick={() => increaseQuantity(item.id, item.variant)}>+</button>
                  </div>
                </div>

                <div className="cart-field cart-field-subtotal">
                  <span className="cart-field-label">Subtotal</span>
                  <span className="subtotal">
                    {formatPrice(item.price * item.quantity)}
                  </span>
                </div>

                <p className="cart-row-tax-note">IVA incluido</p>
              </div>
            ))}
          </div>

          <div className="cart-summary">
            <h2>Totales del carrito</h2>

            <div className="summary-total">
              <span>Subtotal</span>
              <span>{formatPrice(subtotal)}</span>
            </div>

            <div className="delivery-section">
              <h3>Formato de entrega</h3>

              <label className="delivery-option">
                <input
                  type="radio"
                  name="deliveryMethod"
                  value="store"
                  checked={deliveryMethod === "store"}
                  onChange={() => {
                    setDeliveryMethod("store");
                    setSelectedAddress("");
                    setZonaSeleccionada(""); // ✅ reset zona
                  }}
                />
                Retiro en tienda (Gratis)
              </label>

              <label className="delivery-option">
                <input
                  type="radio"
                  name="deliveryMethod"
                  value="nearby"
                  checked={deliveryMethod === "nearby"}
                  onChange={() => {
                    setDeliveryMethod("nearby");
                    setZonaSeleccionada(""); // ✅ reset zona al cambiar
                    if (direccionPredeterminada) {
                      setSelectedAddress(direccionPredeterminada);
                    }
                  }}
                />
                Envío a alrededores ({formatPrice(3000)})
              </label>

              <label className="delivery-option">
                <input
                  type="radio"
                  name="deliveryMethod"
                  value="correos"
                  checked={deliveryMethod === "correos"}
                  onChange={() => {
                    setDeliveryMethod("correos");
                    setZonaSeleccionada(""); // ✅ reset zona
                    if (direccionPredeterminada) {
                      setSelectedAddress(direccionPredeterminada);
                    }
                  }}
                />
                Correos de Costa Rica ({formatPrice(4500)})
              </label>

              {/* ✅ NUEVO: Selector de zona para "nearby" */}
              {deliveryMethod === "nearby" && (
                <div className="cart-zone-box">
                  <h4>Selecciona tu zona</h4>
                  <p className="delivery-info">
                    Solo realizamos envíos a alrededores en las siguientes
                    zonas de Puntarenas:
                  </p>

                  <div className="cart-zone-options">
                    {ZONAS_ALREDEDORES.map((zona) => (
                      <label
                        key={zona.value}
                        className={`cart-zone-option ${
                          zonaSeleccionada === zona.value
                            ? "cart-zone-option--active"
                            : ""
                        }`}
                      >
                        <input
                          type="radio"
                          name="zonaAlrededores"
                          value={zona.value}
                          checked={zonaSeleccionada === zona.value}
                          onChange={() => {
                            setZonaSeleccionada(zona.value);

                            // ✅ NUEVO: al cambiar de zona, solo dejamos
                            // seleccionada una dirección que sí pertenezca
                            // a esa zona (de lo contrario se limpia).
                            const direccionesDeEstaZona = direcciones.filter(
                              (dir) =>
                                direccionPerteneceAZona(dir.direccion, zona.value)
                            );
                            const preferida =
                              direccionesDeEstaZona.find((dir) => dir.predeterminada) ||
                              direccionesDeEstaZona[0];
                            setSelectedAddress(preferida?.direccion || "");
                          }}
                        />
                        {zona.label}
                      </label>
                    ))}
                  </div>

                  {/* Aviso si no ha seleccionado zona */}
                  {zonaSeleccionada === "" && (
                    <p className="cart-zone-warning">
                      ⚠️ Debes seleccionar una zona para continuar.
                    </p>
                  )}
                </div>
              )}

              {deliveryMethod === "store" && (
                <p className="delivery-info">
                  Retire su pedido directamente en nuestra tienda.
                </p>
              )}

              {deliveryMethod === "correos" && (
                <p className="delivery-info">
                  Selecciona una dirección registrada para enviar tu pedido por
                  Correos de Costa Rica.
                </p>
              )}

              {/* Dirección: solo se muestra si ya eligió zona (nearby) o es correos */}
              {requiresAddress &&
                (deliveryMethod === "correos" ||
                  (deliveryMethod === "nearby" && zonaSeleccionada !== "")) && (
                  <div className="cart-address-box cart-address-box-large">
                    <h4>Selecciona tu dirección</h4>

                    {!user ? (
                      <p className="delivery-info">
                        Debes iniciar sesión para seleccionar o guardar una
                        dirección.
                      </p>
                    ) : (
                      <>
                        {/* ✅ NUEVO: en "nearby" solo se listan direcciones de la zona elegida */}
                        {deliveryMethod === "nearby" && zonaSeleccionada && (
                          <p className="delivery-info">
                            Mostrando direcciones de{" "}
                            <strong>
                              {
                                ZONAS_ALREDEDORES.find(
                                  (z) => z.value === zonaSeleccionada
                                )?.label
                              }
                            </strong>{" "}
                            y sus alrededores.
                          </p>
                        )}

                        {direccionesEnZona.length > 0 ? (
                          <select
                            className="cart-address-select cart-address-select-large"
                            value={selectedAddress}
                            onChange={(e) => setSelectedAddress(e.target.value)}
                          >
                            <option value="">Seleccione una dirección</option>
                            {direccionesEnZona.map((dir, index) => (
                              <option
                                key={`${dir.direccion}-${index}`}
                                value={dir.direccion}
                              >
                                {dir.direccion}
                                {dir.predeterminada ? " (Predeterminada)" : ""}
                              </option>
                            ))}
                          </select>
                        ) : direcciones.length > 0 ? (
                          <p className="cart-zone-warning">
                            No tienes direcciones guardadas en esa zona. Agrega
                            una nueva que incluya el distrito para poder
                            usarla.
                          </p>
                        ) : (
                          <p className="delivery-info">
                            No tienes direcciones guardadas.
                          </p>
                        )}

                        {!showNewAddressForm ? (
                          <button
                            type="button"
                            className="btn-secondary-address"
                            onClick={() => setShowNewAddressForm(true)}
                          >
                            Agregar nueva dirección
                          </button>
                        ) : (
                          <div className="cart-new-address-form">
                            <textarea
                              className="cart-address-textarea-large"
                              value={newAddress}
                              onChange={(e) => setNewAddress(e.target.value)}
                              placeholder="Escribe tu nueva dirección"
                              rows={5}
                            />
                            <div className="cart-new-address-actions">
                              <button
                                type="button"
                                className="btn-secondary-address"
                                onClick={handleAddNewAddress}
                                disabled={savingAddress}
                              >
                                {savingAddress ? "GUARDANDO..." : "Guardar dirección"}
                              </button>
                              <button
                                type="button"
                                className="btn-cancel-address"
                                onClick={() => {
                                  setShowNewAddressForm(false);
                                  setNewAddress("");
                                }}
                                disabled={savingAddress}
                              >
                                Cancelar
                              </button>
                            </div>
                          </div>
                        )}

                        {selectedAddress && (
                          <div className="selected-address-preview">
                            <span>Dirección seleccionada:</span>
                            <p>{selectedAddress}</p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
            </div>

            <div className="summary-total">
              <span>Envío</span>
              <span>{formatPrice(shippingCost)}</span>
            </div>

            <div className="summary-total final-total">
              <span>Total</span>
              <span>{formatPrice(total)}</span>
            </div>

            <button
              className="btn-primary"
              disabled={!isDeliveryValid || creatingOrder}
              onClick={handleCreateOrder}
            >
              {creatingOrder ? "PROCESANDO..." : "FINALIZAR COMPRA"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CartPage;
