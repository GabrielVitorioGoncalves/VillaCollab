import { useEffect, useRef, useState, type ReactNode } from "react";
import { addToCart, cartStorageKey, changeQuantity, readCart, removePurchased, type CartLine } from "../lib/cart";
import { CartContext } from "./cart-context";

export function CartProvider({ children }: { children: ReactNode }) {
  const [key] = useState(() => cartStorageKey(sessionStorage.getItem("villacollab_token")));
  const [items, setItems] = useState<CartLine[]>(() => {
    try { return key ? readCart(localStorage.getItem(key)) : []; }
    catch { return []; }
  });
  const latest = useRef(items);
  const [persistenceError, setPersistenceError] = useState("");

  function commit(next: CartLine[]) {
    latest.current = next;
    setItems(next);
    try {
      if (key) localStorage.setItem(key, JSON.stringify(next));
      setPersistenceError("");
    } catch {
      setPersistenceError("O carrinho está disponível nesta aba, mas não foi possível salvá-lo neste navegador.");
    }
  }

  useEffect(() => {
    function sync(event: StorageEvent) {
      if (key && (event.key === key || event.key === null)) {
        const next = readCart(event.newValue);
        latest.current = next;
        setItems(next);
      }
    }
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, [key]);

  return <CartContext.Provider value={{
    items, count: items.reduce((sum, line) => sum + line.quantity, 0), persistenceError,
    add: (product, storeName, quantity) => commit(addToCart(latest.current, product, storeName, quantity)),
    setQuantity: (id, quantity) => commit(changeQuantity(latest.current, id, quantity)),
    remove: id => commit(latest.current.filter(line => line.product.id !== id)),
    completeOrder: purchased => commit(removePurchased(latest.current, purchased)),
  }}>{children}</CartContext.Provider>;
}
