import { Link } from "react-router-dom";
import { useCart } from "../../context/CartContext";
import { formatPrice } from "../../utils/format";
import "./cart.css";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const CartDrawer = ({ isOpen, onClose }: Props) => {
  const { cart, removeFromCart } = useCart();

  const total = cart.reduce(
    (acc, item) => acc + item.price * item.quantity,
    0
  );

  return (
    <div className={`cart-overlay ${isOpen ? "active" : ""}`}>
      <div className="cart-drawer">
        <div className="cart-header">
          <h2>Carrito De Compra</h2>
          <button onClick={onClose}>✕</button>
        </div>

        {cart.length === 0 ? (
          /* EMPTY DRAWER */
          <div className="empty-cart">
            <p>Tu carrito está vacío.</p>

            <Link to="/" onClick={onClose} className="btn-primary">
              VOLVER A LA TIENDA
            </Link>
          </div>
        ) : (
          <>
            <div className="cart-items">
              {cart.map((item) => (
                <div key={`${item.id}-${item.variant ?? ""}`} className="cart-item">
                  <img src={item.image} alt={item.name} />

                  <div>
                    <h4>{item.name}</h4>
                    {item.variant && (
                      <p className="cart-item-variant">{item.variant}</p>
                    )}
                    <p>{formatPrice(item.price)}</p>
                    <p>Cantidad: {item.quantity}</p>
                  </div>

                  <button onClick={() => removeFromCart(item.id, item.variant)}>
                    ❌
                  </button>
                </div>
              ))}
            </div>

            <div className="cart-footer">
              <h3>Total: {formatPrice(total)}</h3>

              <Link
                to="/cart"
                onClick={onClose}
                className="btn-primary"
              >
                IR A COMPRAR
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CartDrawer;