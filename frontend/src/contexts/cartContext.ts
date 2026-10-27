import { createContext, useContext } from "react";

import type { Produto } from "../types/api";

// O backend não guarda carrinho: ele vive no navegador até virar pedido.
export interface CartLine {
  // Produto + variações escolhidas. A mesma camiseta em P e em M são linhas diferentes.
  key: string;
  productId: string;
  storeId: string;
  storeName: string;
  name: string;
  price: number;
  // Estoque é do produto, somando todas as variações.
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
  // Devolve quantas unidades entraram de fato (pode ser menos, por causa do estoque).
  addItem: (
    product: Produto,
    storeName: string,
    quantity?: number,
    variants?: Record<string, string>
  ) => number;
  setQuantity: (key: string, quantity: number) => void;
  removeItem: (key: string) => void;
  removeItems: (keys: string[]) => void;
  // Atualiza preço, nome e estoque com o que veio da API. `null` = produto não existe mais.
  syncProducts: (products: Record<string, Produto | null>) => void;
  clear: () => void;
  // Envia já para o servidor o que ainda estiver pendente (usado antes do logout).
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

// Quantas unidades do produto já estão no carrinho, em todas as variações.
export function quantityInCart(lines: CartLine[], productId: string, exceptKey?: string) {
  return lines
    .filter((line) => line.productId === productId && line.key !== exceptKey)
    .reduce((total, line) => total + line.quantity, 0);
}
