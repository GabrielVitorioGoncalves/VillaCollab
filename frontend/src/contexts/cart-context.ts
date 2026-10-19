import { createContext, useContext } from "react";
import type { CartLine } from "../lib/cart";
import type { Produto } from "../types/api";

export interface CartContextValue {
  items: CartLine[];
  count: number;
  persistenceError: string;
  add: (product: Produto, storeName: string, quantity?: number) => void;
  setQuantity: (id: string, quantity: number) => void;
  remove: (id: string) => void;
  completeOrder: (purchased: CartLine[]) => void;
}

export const CartContext = createContext<CartContextValue | null>(null);

export function useCart() {
  const value = useContext(CartContext);
  if (!value) throw new Error("O carrinho precisa estar dentro do CartProvider.");
  return value;
}
