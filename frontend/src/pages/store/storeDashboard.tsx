import {
  ArrowDownRight,
  ArrowUpRight,
  ClipboardList,
  Package,
  ShoppingBag,
  Wallet,
} from "lucide-react";

import { Card } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { PageHeader } from "../../components/layout/pageHeader";

const stats = [
  {
    title: "Vendas totais",
    value: "R$ 8.450,00",
    variation: "+12,5%",
    positive: true,
    description: "em relação ao mês anterior",
    icon: Wallet,
  },
  {
    title: "Pedidos recebidos",
    value: "48",
    variation: "+8,2%",
    positive: true,
    description: "em relação ao mês anterior",
    icon: ShoppingBag,
  },
  {
    title: "Produtos cadastrados",
    value: "32",
    variation: "4 sem estoque",
    positive: false,
    description: "produtos ativos na loja",
    icon: Package,
  },
  {
    title: "Pedidos pendentes",
    value: "7",
    variation: "Requer atenção",
    positive: false,
    description: "aguardando processamento",
    icon: ClipboardList,
  },
];

const recentOrders = [
  {
    id: "1008",
    customer: "Mariana Costa",
    date: "20/10/2026",
    total: 249.9,
    status: "Pendente",
  },
  {
    id: "1007",
    customer: "Pedro Henrique",
    date: "19/10/2026",
    total: 159.9,
    status: "Enviado",
  },
  {
    id: "1006",
    customer: "Ana Beatriz",
    date: "19/10/2026",
    total: 89.9,
    status: "Concluído",
  },
  {
    id: "1005",
    customer: "Rafael Martins",
    date: "18/10/2026",
    total: 319.9,
    status: "Processando",
  },
];

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function getStatusClass(status: string) {
  switch (status) {
    case "Concluído":
      return "bg-green-50 text-green-700";
    case "Enviado":
      return "bg-blue-50 text-blue-700";
    case "Pendente":
      return "bg-yellow-50 text-yellow-700";
    default:
      return "bg-background-secondary text-text-secondary";
  }
}

export function Dashboard() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description="Acompanhe o desempenho e a atividade da sua loja."
        action={
          <Button onClick={() => window.location.assign("/store/produtos/novo")}>
            Novo produto
          </Button>
        }
      />

      <section>
        <div className="mb-4">
          <h2 className="text-base font-semibold text-text">
            Visão geral
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => {
            const Icon = stat.icon;

            return (
              <Card key={stat.title} className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-medium text-text-secondary">
                    {stat.title}
                  </p>

                  <div className="rounded-lg bg-background-secondary p-2">
                    <Icon size={19} className="text-text-secondary" />
                  </div>
                </div>

                <p className="mt-4 text-2xl font-bold tracking-tight text-text">
                  {stat.value}
                </p>

                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  {stat.positive ? (
                    <ArrowUpRight size={15} className="text-success" />
                  ) : (
                    <ArrowDownRight size={15} className="text-text-secondary" />
                  )}

                  <span
                    className={`text-xs font-medium ${
                      stat.positive ? "text-success" : "text-text-secondary"
                    }`}
                  >
                    {stat.variation}
                  </span>
                </div>

                <p className="mt-1 text-xs text-text-secondary">
                  {stat.description}
                </p>
              </Card>
            );
          })}
        </div>
      </section>

      <section>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-text">
              Pedidos recentes
            </h2>
          </div>

          <Button
            variant="outline"
            onClick={() => window.location.assign("/store/pedidos")}
          >
            Ver todos os pedidos
          </Button>
        </div>

        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[650px] text-left text-sm">
              <thead className="border-b border-border bg-background">
                <tr>
                  <th className="px-5 py-3.5 font-medium text-text-secondary">
                    Pedido
                  </th>
                  <th className="px-5 py-3.5 font-medium text-text-secondary">
                    Cliente
                  </th>
                  <th className="px-5 py-3.5 font-medium text-text-secondary">
                    Data
                  </th>
                  <th className="px-5 py-3.5 font-medium text-text-secondary">
                    Total
                  </th>
                  <th className="px-5 py-3.5 font-medium text-text-secondary">
                    Status
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-border">
                {recentOrders.map((order) => (
                  <tr
                    key={order.id}
                    className="transition-colors hover:bg-background/70"
                  >
                    <td className="px-5 py-4 font-medium text-text">
                      #{order.id}
                    </td>
                    <td className="px-5 py-4 text-text">
                      {order.customer}
                    </td>
                    <td className="px-5 py-4 text-text-secondary">
                      {order.date}
                    </td>
                    <td className="px-5 py-4 font-medium text-text">
                      {formatCurrency(order.total)}
                    </td>
                    <td className="px-5 py-4">
                      <Badge className={getStatusClass(order.status)}>
                        {order.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </section>
    </div>
  );
}