import type { Pedido } from "../../types/api";
import { Badge } from "../ui/badge";

const statuses = {
  pendente: { label: "Pendente", variant: "warning" },
  aceito: { label: "Aceito", variant: "default" },
  concluido: { label: "Concluído", variant: "success" },
  cancelado: { label: "Cancelado", variant: "danger" },
} as const;

export function OrderStatusBadge({ status }: { status: Pedido["status"] }) {
  const value = statuses[status];
  return <Badge variant={value.variant}>{value.label}</Badge>;
}
