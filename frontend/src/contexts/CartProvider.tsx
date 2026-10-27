import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { variantLabel } from "../lib/catalog";
import { toNumber } from "../lib/format";
import { getCart, saveCart } from "../lib/services";
import { getUserId, SESSION_CHANGED_EVENT } from "../lib/session";
import type { CarrinhoItem, Produto } from "../types/api";
import {
  CartContext,
  lineKey,
  quantityInCart,
  type CartLine,
  type CartNotice,
} from "./cartContext";

const LEGACY_KEY = "villacollab_cart";
const GUEST = "visitante";
const MAX_QUANTITY = 1000;
const SAVE_DELAY = 400;

type Owner = string | null;

interface CartState {
  owner: Owner;
  lines: CartLine[];
  dirty: boolean;
}

function storageKey(owner: Owner) {
  return `villacollab_cart:${owner ?? GUEST}`;
}

function readLine(value: unknown): CartLine | null {
  if (!value || typeof value !== "object") return null;
  const line = value as Record<string, unknown>;
  const valid =
    typeof line.productId === "string" &&
    typeof line.storeId === "string" &&
    typeof line.storeName === "string" &&
    typeof line.name === "string" &&
    typeof line.price === "number" &&
    typeof line.stock === "number" &&
    typeof line.quantity === "number" &&
    line.quantity > 0;
  if (!valid) return null;
  const parsed = line as unknown as CartLine;
  return { ...parsed, key: typeof line.key === "string" ? line.key : lineKey(parsed.productId, parsed.variants) };
}

interface LocalCart {
  lines: CartLine[];
  dirty: boolean;
}

function loadLocal(owner: Owner): LocalCart {
  try {
    localStorage.removeItem(LEGACY_KEY);
    const parsed: unknown = JSON.parse(localStorage.getItem(storageKey(owner)) ?? "[]");
    const raw = Array.isArray(parsed) ? parsed : (parsed as { lines?: unknown })?.lines;
    if (!Array.isArray(raw)) return { lines: [], dirty: false };
    return {
      lines: raw.map(readLine).filter((line): line is CartLine => line !== null),
      dirty: !Array.isArray(parsed) && (parsed as { dirty?: unknown }).dirty === true,
    };
  } catch {
    return { lines: [], dirty: false };
  }
}

function saveLocal(owner: Owner, lines: CartLine[], dirty: boolean) {
  try {
    if (lines.length === 0 && !dirty) localStorage.removeItem(storageKey(owner));
    else localStorage.setItem(storageKey(owner), JSON.stringify({ lines, dirty }));
  } catch {
    // sem storage, o carrinho fica só em memória
  }
}

function fromServer(items: CarrinhoItem[]): CartLine[] {
  return items.flatMap((item) => {
    const product = item.produtos;
    if (!product) return [];
    const variants = item.variacoes ?? {};
    const label = variantLabel(product.variacoes, variants);
    return [
      {
        key: lineKey(product.id, variants),
        productId: product.id,
        storeId: product.loja_id,
        storeName: product.lojas?.nome ?? "",
        name: product.nome,
        price: toNumber(product.preco),
        stock: product.ativo === false ? 0 : product.estoque,
        quantity: item.quantidade,
        image: product.imagens?.[0],
        variants,
        variantLabel: label || undefined,
      },
    ];
  });
}

function toServer(lines: CartLine[]) {
  return lines.map((line) => ({
    produto_id: line.productId,
    quantidade: line.quantity,
    ...(line.variants && Object.keys(line.variants).length > 0 ? { variacoes: line.variants } : {}),
  }));
}

function mergeLines(base: CartLine[], extra: CartLine[], mode: "sum" | "prefer"): CartLine[] {
  const result = base.map((line) => ({ ...line }));
  for (const line of extra) {
    const found = result.find((item) => item.key === line.key);
    if (!found) {
      result.push({ ...line });
    } else {
      const quantity = mode === "sum" ? found.quantity + line.quantity : line.quantity;
      found.quantity = Math.max(1, Math.min(quantity, Math.max(found.stock, 1), MAX_QUANTITY));
    }
  }
  return result;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<CartState>(() => {
    const owner = getUserId();
    return { owner, ...loadLocal(owner) };
  });
  const [notice, setNotice] = useState<CartNotice | null>(null);
  const { owner, lines, dirty } = state;

  const pending = useRef<{ owner: string; lines: CartLine[] } | null>(null);

  useEffect(() => {
    const onSessionChange = () => {
      const next = getUserId();
      setState((current) =>
        current.owner === next ? current : { owner: next, ...loadLocal(next) }
      );
    };
    window.addEventListener(SESSION_CHANGED_EVENT, onSessionChange);
    return () => window.removeEventListener(SESSION_CHANGED_EVENT, onSessionChange);
  }, []);

  useEffect(() => {
    if (!owner) return;
    let active = true;

    getCart().then(
      (items) => {
        if (!active) return;
        const guest = loadLocal(null).lines;
        if (guest.length > 0) saveLocal(null, [], false);

        setState((current) => {
          if (current.owner !== owner) return current;
          let next = fromServer(items);
          let needsSave = false;
          if (current.dirty) {
            next = mergeLines(next, current.lines, "prefer");
            needsSave = true;
          }
          if (guest.length > 0) {
            next = mergeLines(next, guest, "sum");
            needsSave = true;
          }
          return { owner, lines: next, dirty: needsSave };
        });
      },
      () => {
      }
    );

    return () => {
      active = false;
    };
  }, [owner]);

  useEffect(() => {
    saveLocal(owner, lines, dirty);
  }, [owner, lines, dirty]);

  useEffect(() => {
    if (!owner || !dirty) {
      pending.current = null;
      return;
    }
    pending.current = { owner, lines };
    const timer = window.setTimeout(() => {
      pending.current = null;
      saveCart(toServer(lines)).then(
        () => setState((current) => (current.lines === lines ? { ...current, dirty: false } : current)),
        () => {
        }
      );
    }, SAVE_DELAY);
    return () => window.clearTimeout(timer);
  }, [owner, lines, dirty]);

  const flush = useCallback(async () => {
    const job = pending.current;
    pending.current = null;
    if (!job || job.owner !== getUserId()) return;
    try {
      await saveCart(toServer(job.lines));
    } catch {
      // a cópia local continua salva
    }
  }, []);

  const update = useCallback((change: (lines: CartLine[]) => CartLine[]) => {
    setState((current) => ({ ...current, lines: change(current.lines), dirty: true }));
  }, []);

  const addItem = useCallback(
    (product: Produto, storeName: string, quantity = 1, variants: Record<string, string> = {}) => {
      const key = lineKey(product.id, variants);
      const stock = product.estoque;
      const current = lines.find((line) => line.key === key)?.quantity ?? 0;
      const others = quantityInCart(lines, product.id, key);
      const max = Math.max(0, Math.min(stock - others, MAX_QUANTITY));
      const target = Math.min(current + quantity, max);
      const added = Math.max(0, target - current);
      const label = variantLabel(product.variacoes, variants);

      if (added > 0) {
        update((previous) => {
          const fresh: CartLine = {
            key,
            productId: product.id,
            storeId: product.loja_id,
            storeName,
            name: product.nome,
            price: toNumber(product.preco),
            stock,
            quantity: target,
            image: product.imagens?.[0],
            variants,
            variantLabel: label || undefined,
          };
          return previous.some((line) => line.key === key)
            ? previous.map((line) => (line.key === key ? fresh : line))
            : [...previous, fresh];
        });
      }

      const fullName = label ? `${product.nome} (${label})` : product.nome;
      setNotice({
        id: Date.now(),
        text:
          added > 0
            ? `${fullName} foi para o carrinho.`
            : stock <= 0
              ? `${product.nome} está sem estoque.`
              : `Você já tem todas as unidades disponíveis de ${product.nome} no carrinho.`,
      });

      return added;
    },
    [lines, update]
  );

  const setQuantity = useCallback(
    (key: string, quantity: number) => {
      update((previous) =>
        previous.map((line) =>
          line.key === key
            ? { ...line, quantity: Math.max(1, Math.min(Math.floor(quantity), MAX_QUANTITY)) }
            : line
        )
      );
    },
    [update]
  );

  const removeItem = useCallback(
    (key: string) => update((previous) => previous.filter((line) => line.key !== key)),
    [update]
  );

  const removeItems = useCallback(
    (keys: string[]) => {
      const remove = new Set(keys);
      update((previous) => previous.filter((line) => !remove.has(line.key)));
    },
    [update]
  );

  const syncProducts = useCallback((products: Record<string, Produto | null>) => {
    setState((current) => ({
      ...current,
      lines: current.lines.map((line) => {
        if (!(line.productId in products)) return line;
        const product = products[line.productId];
        if (!product) return { ...line, stock: 0 };
        const label = variantLabel(product.variacoes, line.variants);
        return {
          ...line,
          name: product.nome,
          price: toNumber(product.preco),
          stock: product.ativo === false ? 0 : product.estoque,
          image: product.imagens?.[0] ?? line.image,
          variantLabel: label || line.variantLabel,
        };
      }),
    }));
  }, []);

  const clear = useCallback(() => update(() => []), [update]);

  const value = useMemo(
    () => ({
      lines,
      count: lines.reduce((total, line) => total + line.quantity, 0),
      notice,
      addItem,
      setQuantity,
      removeItem,
      removeItems,
      syncProducts,
      clear,
      flush,
    }),
    [lines, notice, addItem, setQuantity, removeItem, removeItems, syncProducts, clear, flush]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
