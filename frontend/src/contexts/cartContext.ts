import { createContext, useContext } from "react";

import type { Produto } from "../types/api";

export interface CartLine {
  key: string;
  productId: string;
  storeId: string;
  storeName: string;
  name: string;
  price: number;
  stock: number;
  quantity: number;
  image?: string;
  variants?: Record<string, string>;
  variantLabel?: string;
}

export interface CartNotice {
  id: number;
  text: string;
}

export interface CartContextValue {
  lines: CartLine[];
  count: number;
  notice: CartNotice | null;
  addItem: (
    product: Produto,
    storeName: string,
    quantity?: number,
    variants?: Record<string, string>
  ) => number;
  setQuantity: (key: string, quantity: number) => void;
  removeItem: (key: string) => void;
  removeItems: (keys: string[]) => void;
  syncProducts: (products: Record<string, Produto | null>) => void;
  clear: () => void;
  flush: () => Promise<void>;
}

export const CartContext = createContext<CartContextValue | null>(null);

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart precisa estar dentro de <CartProvider>");
  return context;
}

export function lineKey(productId: string, variants: Record<string, string> = {}) {
  const parts = Object.keys(variants)
    .sort()
    .map((id) => `${id}=${variants[id]}`);
  return parts.length ? `${productId}|${parts.join("&")}` : productId;
}

export function quantityInCart(lines: CartLine[], productId: string, exceptKey?: string) {
  return lines
    .filter((line) => line.productId === productId && line.key !== exceptKey)
    .reduce((total, line) => total + line.quantity, 0);
}
