import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Price } from "../../components/marketplace/price";
import { useNavigate } from "react-router-dom";

type OrderStatus =
  | "delivered"
  | "processing"
  | "shipped"
  | "cancelled";

interface Order {
  id: string;
  storeName: string;
  date: string;
  status: OrderStatus;
  items: number;
  total: number;
}

const orders: Order[] = [
  {
    id: "1001",
    storeName: "Urban Store",
    date: "23 de setembro de 2026",
    status: "delivered",
    items: 3,
    total: 429.7,
  },
  {
    id: "1002",
    storeName: "Tech House",
    date: "18 de setembro de 2026",
    status: "shipped",
    items: 1,
    total: 249.9,
  },
  {
    id: "1003",
    storeName: "Street Wear",
    date: "10 de setembro de 2026",
    status: "processing",
    items: 2,
    total: 179.8,
  },
  {
    id: "1004",
    storeName: "Casa & Estilo",
    date: "02 de setembro de 2026",
    status: "cancelled",
    items: 1,
    total: 89.9,
  },
];

const statusConfig: Record<
  OrderStatus,
  {
    label: string;
    variant: "default" | "success" | "warning" | "danger";
  }
> = {
  delivered: {
    label: "Entregue",
    variant: "success",
  },
  processing: {
    label: "Processando",
    variant: "warning",
  },
  shipped: {
    label: "Enviado",
    variant: "default",
  },
  cancelled: {
    label: "Cancelado",
    variant: "danger",
  },
};

export function MyOrders() {
    const navigate = useNavigate();

    const handleViewOrder = (order: Order) => {
        navigate(`/user/pedidos/${order.id}`);
    };

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-[1240px] px-5 py-10">
        {/* Cabeçalho */}
        <section className="mb-8">
          <h1 className="text-3xl font-bold text-text">
            Histórico de pedidos
          </h1>

          <p className="mt-1 text-sm text-text-secondary">
            Consulte seus pedidos e acompanhe o status das suas compras.
          </p>
        </section>

        {/* Lista de pedidos */}
        <section className="space-y-4">
          {orders.map((order) => {
            const status = statusConfig[order.status];

            return (
              <Card
                key={order.id}
                className="overflow-hidden"
              >
                {/* Cabeçalho do pedido */}
                <div
                  className="
                    flex
                    flex-col
                    gap-4
                    border-b
                    border-border
                    p-5
                    sm:flex-row
                    sm:items-center
                    sm:justify-between
                  "
                >
                  <div>
                    <h2 className="font-semibold text-text">
                      Pedido {order.id} - {order.storeName}
                    </h2>

                    <p className="mt-1 text-sm text-text-secondary">
                      Realizado em {order.date}
                    </p>
                  </div>

                  <Badge variant={status.variant}>
                    {status.label}
                  </Badge>
                </div>

                {/* Informações */}
                <div
                  className="
                    flex
                    flex-col
                    gap-5
                    p-5
                    sm:flex-row
                    sm:items-center
                    sm:justify-between
                  "
                >
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <p className="text-xs text-text-secondary">
                        Produtos
                      </p>

                      <p className="mt-1 text-sm font-medium text-text">
                        {order.items}{" "}
                        {order.items === 1
                          ? "item"
                          : "itens"}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-text-secondary">
                        Total
                      </p>

                      <div className="mt-1">
                        <Price
                          value={order.total}
                          size="sm"
                        />
                      </div>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    onClick={() => handleViewOrder(order)}
                  >
                    Ver pedido
                  </Button>
                </div>
              </Card>
            );
          })}
        </section>

        {/* Estado vazio */}
        {orders.length === 0 && (
          <Card className="p-10">
            <div className="text-center">
              <h2 className="text-lg font-semibold text-text">
                Nenhum pedido encontrado
              </h2>

              <p className="mt-2 text-sm text-text-secondary">
                Seus pedidos aparecerão aqui após realizar uma compra.
              </p>
            </div>
          </Card>
        )}
      </div>
    </main>
  );
}