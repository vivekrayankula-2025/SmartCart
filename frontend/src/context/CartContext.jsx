import { createContext, useContext, useEffect, useMemo, useState } from "react";

const CartContext = createContext(null);

const FREE_SHIPPING_THRESHOLD = 4999;
const SHIPPING_FEE = 99;

function usePersistentState(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(key)) ?? initial;
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue];
}

export function CartProvider({ children }) {
  const [cart, setCart] = usePersistentState("sc-cart-v2", []);
  const [wishlist, setWishlist] = usePersistentState("sc-wishlist", []);

  const value = useMemo(() => {
    const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
    const shipping = cart.length === 0 || subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;

    return {
      cart,
      wishlist,
      cartCount: cart.reduce((sum, item) => sum + item.qty, 0),
      subtotal,
      shipping,
      total: subtotal + shipping,
      freeShippingThreshold: FREE_SHIPPING_THRESHOLD,

      addToCart: (product) =>
        setCart((items) =>
          items.some((item) => item.id === product.id)
            ? items.map((item) =>
                item.id === product.id
                  ? { ...item, qty: Math.min(item.qty + 1, product.stock) }
                  : item,
              )
            : [...items, { ...product, qty: 1 }],
        ),

      updateQty: (id, qty) =>
        setCart((items) =>
          items.map((item) =>
            item.id === id ? { ...item, qty: Math.max(1, Math.min(qty, item.stock)) } : item,
          ),
        ),

      removeFromCart: (id) => setCart((items) => items.filter((item) => item.id !== id)),
      clearCart: () => setCart([]),

      isWishlisted: (id) => wishlist.some((item) => item.id === id),
      toggleWishlist: (product) =>
        setWishlist((items) =>
          items.some((item) => item.id === product.id)
            ? items.filter((item) => item.id !== product.id)
            : [...items, product],
        ),
    };
  }, [cart, wishlist, setCart, setWishlist]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export const useCart = () => useContext(CartContext);
