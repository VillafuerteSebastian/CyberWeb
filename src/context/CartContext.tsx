import { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";

export interface CartItem {
  id: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
  /** Variante elegida (ej. "Rojo" o "Longitud: 2m"), si el producto tiene. */
  variant?: string;
}

// Dos líneas del carrito son "la misma" si tienen el mismo producto Y la
// misma variante — así "Rojo" y "Azul" del mismo producto quedan separados.
const sameLine = (a: { id: string; variant?: string }, b: { id: string; variant?: string }) =>
  a.id === b.id && (a.variant || "") === (b.variant || "");

interface CartContextType {
  cart: CartItem[];
  addToCart: (product: Omit<CartItem, "quantity">) => void;
  removeFromCart: (id: string, variant?: string) => void;
  increaseQuantity: (id: string, variant?: string) => void;
  decreaseQuantity: (id: string, variant?: string) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

// Lee el carrito guardado de forma síncrona (initializer de useState) en vez
// de en un useEffect aparte: con dos efectos separados (uno que lee y otro
// que escribe), el efecto de escritura corre con el valor inicial `[]` antes
// de que el de lectura termine de aplicar el estado guardado, y lo pisa —
// en Strict Mode (doble montaje) eso vacía el carrito en cada recarga.
const readStoredCart = (): CartItem[] => {
  try {
    const stored = localStorage.getItem("cart");
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [cart, setCart] = useState<CartItem[]>(readStoredCart);

  useEffect(() => {
    localStorage.setItem("cart", JSON.stringify(cart));
  }, [cart]);

  const addToCart = (product: Omit<CartItem, "quantity">) => {
    const existing = cart.find((item) => sameLine(item, product));

    if (existing) {
      increaseQuantity(product.id, product.variant);
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
  };

  const removeFromCart = (id: string, variant?: string) => {
    setCart(cart.filter((item) => !sameLine(item, { id, variant })));
  };

  const increaseQuantity = (id: string, variant?: string) => {
    setCart(
      cart.map((item) =>
        sameLine(item, { id, variant })
          ? { ...item, quantity: item.quantity + 1 }
          : item
      )
    );
  };

  const decreaseQuantity = (id: string, variant?: string) => {
    setCart(
      cart
        .map((item) =>
          sameLine(item, { id, variant })
            ? { ...item, quantity: item.quantity - 1 }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const clearCart = () => {
    setCart([]);
    localStorage.removeItem("cart");
  };

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        increaseQuantity,
        decreaseQuantity,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used inside CartProvider");
  }
  return context;
};