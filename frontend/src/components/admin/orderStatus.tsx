import { Badge } from "../ui/badge";

export type OrderStatusType =
  | "pending"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled";

interface OrderStatusProps {
  status: OrderStatusType;
}

const statusConfig: Record<
  OrderStatusType,
  {
    label: string;
    variant: "default" | "success" | "warning" | "danger";
  }
> = {
  pending: {
    label: "Pendente",
    variant: "warning",
  },
  processing: {
    label: "Processando",
    variant: "default",
  },
  shipped: {
    label: "Enviado",
    variant: "default",
  },
  delivered: {
    label: "Entregue",
    variant: "success",
  },
  cancelled: {
    label: "Cancelado",
    variant: "danger",
  },
};

export function OrderStatus({
  status,
}: OrderStatusProps) {
  const config = statusConfig[status];

  return (
    <Badge variant={config.variant}>
      {config.label}
    </Badge>
  );
}