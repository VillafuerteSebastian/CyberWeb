export interface Product {
  id: string
  name: string
  price: number
  image: string
}

export interface CartItemType extends Product {
  quantity: number
}

export interface CartContextType {
  cart: CartItemType[]
  addToCart: (product: Product) => void
  removeFromCart: (id: string) => void
  increaseQuantity: (id: string) => void
  decreaseQuantity: (id: string) => void
  clearCart: () => void
}