import type { Produto } from "../types/api.ts";

export interface CartLine {
  product: Produto;
  storeName: string;
  quantity: number;
}

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function cartStorageKey(token: string | null): string | null {
  try {
    const payload = token?.split(".")[1];
    if (!payload) return null;
    const { sub } = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    return typeof sub === "string" && uuid.test(sub) ? `villacollab_cart:v1:${sub}` : null;
  } catch { return null; }
}

export function readCart(raw: string | null): CartLine[] {
  try {
    const value: unknown = JSON.parse(raw || "[]");
    if (!Array.isArray(value)) return [];
    const seen = new Set<string>();
    return value.slice(0, 500).filter((line): line is CartLine => {
      const p = line?.product;
      if (!p || !uuid.test(p.id) || !uuid.test(p.loja_id) || typeof p.nome !== "string"
        || !Number.isFinite(p.preco) || p.preco <= 0 || !Number.isInteger(p.estoque) || p.estoque < 0
        || typeof line.storeName !== "string" || !Number.isInteger(line.quantity)
        || line.quantity < 1 || line.quantity > 1000 || seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });
  } catch { return []; }
}

export function maxQuantity(product: Produto): number {
  return Math.min(product.estoque, 1000);
}

export function addToCart(lines: CartLine[], product: Produto, storeName: string, quantity = 1): CartLine[] {
  const current = lines.find(line => line.product.id === product.id);
  const total = (current?.quantity || 0) + quantity;
  if (!Number.isInteger(quantity) || quantity < 1 || total > maxQuantity(product)) {
    throw new Error(`Quantidade indisponível. Limite atual: ${maxQuantity(product)} unidade(s).`);
  }
  if (!current && lines.filter(line => line.product.loja_id === product.loja_id).length >= 50) {
    throw new Error("Cada pedido pode conter até 50 produtos diferentes por loja.");
  }
  return current
    ? lines.map(line => line.product.id === product.id ? { product, storeName, quantity: total } : line)
    : [...lines, { product, storeName, quantity }];
}

export function changeQuantity(lines: CartLine[], id: string, quantity: number): CartLine[] {
  const line = lines.find(item => item.product.id === id);
  if (!line) return lines;
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > maxQuantity(line.product)) {
    throw new Error("A quantidade deve respeitar o estoque disponível.");
  }
  return lines.map(item => item.product.id === id ? { ...item, quantity } : item);
}

export function subtotal(lines: CartLine[]): number {
  return lines.reduce((total, line) => total + Math.round(line.product.preco * 100) * line.quantity, 0) / 100;
}

export function orderBody(storeId: string, lines: CartLine[]) {
  const selected = lines.filter(line => line.product.loja_id === storeId);
  if (!selected.length) throw new Error("Não há produtos dessa loja no carrinho.");
  return { loja_id: storeId, itens: selected.map(line => ({ produto_id: line.product.id, quantidade: line.quantity })) };
}

export function removePurchased(lines: CartLine[], purchased: CartLine[]): CartLine[] {
  return lines.flatMap(line => {
    const bought = purchased.find(item => item.product.id === line.product.id);
    const quantity = line.quantity - (bought?.quantity || 0);
    return quantity > 0 ? [{ ...line, quantity }] : [];
  });
}
