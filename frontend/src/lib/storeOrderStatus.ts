import type { PedidoStatus } from "../types/api";

export const storeStatusLabel: Record<PedidoStatus, string> = {
  pendente: "Pendente",
  aceito: "Confirmado",
  enviado: "Enviado",
  concluido: "Entregue",
  cancelado: "Cancelado",
};

export const storeStatusStyle: Record<PedidoStatus, string> = {
  pendente: "border-yellow-200 bg-yellow-50 text-yellow-700",
  aceito: "border-blue-200 bg-blue-50 text-blue-700",
  enviado: "border-violet-200 bg-violet-50 text-violet-700",
  concluido: "border-green-200 bg-green-50 text-green-700",
  cancelado: "border-red-200 bg-red-50 text-red-700",
};
