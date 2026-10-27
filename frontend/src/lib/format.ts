import type { PedidoStatus } from "../types/api";

export function toNumber(value: number | string | null | undefined): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

// O id do pedido é um UUID; para leitura humana mostramos só o começo.
export function shortOrderId(id: string): string {
  return id.slice(0, 8).toUpperCase();
}

export const orderStatusConfig: Record<
  PedidoStatus,
  { label: string; variant: "default" | "success" | "warning" | "danger" }
> = {
  pendente: { label: "Aguardando a loja", variant: "warning" },
  aceito: { label: "Aceito pela loja", variant: "default" },
  concluido: { label: "Concluído", variant: "success" },
  cancelado: { label: "Cancelado", variant: "danger" },
};

export function isUuid(value: string | undefined): value is string {
  return !!value && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
