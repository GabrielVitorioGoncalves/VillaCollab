import type { CartLine } from "../contexts/cartContext";
import type { Produto } from "../types/api";
import { ApiError } from "./api";
import { getProduct } from "./services";

export interface StoreGroup {
  storeId: string;
  storeName: string;
  lines: CartLine[];
  subtotal: number;
}

export function groupByStore(lines: CartLine[]): StoreGroup[] {
  const groups = new Map<string, StoreGroup>();

  for (const line of lines) {
    const group = groups.get(line.storeId) ?? {
      storeId: line.storeId,
      storeName: line.storeName,
      lines: [],
      subtotal: 0,
    };
    group.lines.push(line);
    group.subtotal += line.price * line.quantity;
    groups.set(line.storeId, group);
  }

  return [...groups.values()];
}

export function cartSubtotal(lines: CartLine[]): number {
  return lines.reduce((total, line) => total + line.price * line.quantity, 0);
}

export function lineProblem(line: CartLine, lines: CartLine[]): string | undefined {
  if (line.stock <= 0) return "Este produto não está mais disponível. Remova para continuar.";
  const total = lines
    .filter((item) => item.productId === line.productId)
    .reduce((sum, item) => sum + item.quantity, 0);
  if (total > line.stock) {
    const shared = total !== line.quantity ? " somando as variações" : "";
    return line.stock === 1
      ? `Só resta 1 unidade${shared}. Ajuste a quantidade.`
      : `Só restam ${line.stock} unidades${shared}. Ajuste a quantidade.`;
  }
  return undefined;
}

export async function fetchCartProducts(productIds: string[]) {
  const entries = await Promise.all(
    productIds.map(async (id): Promise<[string, Produto | null]> => {
      try {
        return [id, await getProduct(id)];
      } catch (error) {
        if (error instanceof ApiError && (error.status === 404 || error.status === 400)) {
          return [id, null];
        }
        throw error;
      }
    })
  );
  return Object.fromEntries(entries);
}
