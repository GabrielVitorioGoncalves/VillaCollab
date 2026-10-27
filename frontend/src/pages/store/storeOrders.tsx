import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  ShoppingBag,
  Eye,
  Clock3,
  CheckCircle2,
  Truck,
  XCircle,
} from "lucide-react";

import { PageHeader } from "../../components/layout/pageHeader";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";

type OrderStatus =
  | "Pendente"
  | "Confirmado"
  | "Enviado"
  | "Entregue"
  | "Cancelado";

interface Order {
  id: string;
  customer: string;
  date: string;
  items: number;
  total: number;
  status: OrderStatus;
}

const mockOrders: Order[] = [
  {
    id: "PED-1024",
    customer: "Mariana Costa",
    date: "20/10/2026",
    items: 2,
    total: 189.9,
    status: "Pendente",
  },
  {
    id: "PED-1023",
    customer: "Rafael Mendes",
    date: "19/10/2026",
    items: 1,
    total: 79.9,
    status: "Confirmado",
  },
  {
    id: "PED-1022",
    customer: "Ana Oliveira",
    date: "19/10/2026",
    items: 3,
    total: 249.5,
    status: "Enviado",
  },
  {
    id: "PED-1021",
    customer: "Lucas Ferreira",
    date: "18/10/2026",
    items: 2,
    total: 119.9,
    status: "Entregue",
  },
  {
    id: "PED-1020",
    customer: "Camila Santos",
    date: "17/10/2026",
    items: 1,
    total: 59.9,
    status: "Cancelado",
  },
  {
    id: "PED-1019",
    customer: "Pedro Almeida",
    date: "16/10/2026",
    items: 4,
    total: 329.9,
    status: "Entregue",
  },
];

const statusOptions = [
  "Todos",
  "Pendente",
  "Confirmado",
  "Enviado",
  "Entregue",
  "Cancelado",
] as const;

function getStatusStyle(status: OrderStatus) {
  switch (status) {
    case "Pendente":
      return "border-yellow-200 bg-yellow-50 text-yellow-700";
    case "Confirmado":
      return "border-blue-200 bg-blue-50 text-blue-700";
    case "Enviado":
      return "border-violet-200 bg-violet-50 text-violet-700";
    case "Entregue":
      return "border-green-200 bg-green-50 text-green-700";
    case "Cancelado":
      return "border-red-200 bg-red-50 text-red-700";
  }
}

function getStatusIcon(status: OrderStatus) {
  switch (status) {
    case "Pendente":
      return <Clock3 size={14} />;
    case "Confirmado":
      return <CheckCircle2 size={14} />;
    case "Enviado":
      return <Truck size={14} />;
    case "Entregue":
      return <CheckCircle2 size={14} />;
    case "Cancelado":
      return <XCircle size={14} />;
  }
}

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function Orders() {
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [selectedStatus, setSelectedStatus] =
    useState<(typeof statusOptions)[number]>("Todos");

  const filteredOrders = useMemo(() => {
    return mockOrders.filter((order) => {
      const matchesSearch =
        order.id.toLowerCase().includes(search.toLowerCase()) ||
        order.customer.toLowerCase().includes(search.toLowerCase());

      const matchesStatus =
        selectedStatus === "Todos" || order.status === selectedStatus;

      return matchesSearch && matchesStatus;
    });
  }, [search, selectedStatus]);

  const totalOrders = mockOrders.length;
  const pendingOrders = mockOrders.filter(
    (order) => order.status === "Pendente",
  ).length;
  const shippedOrders = mockOrders.filter(
    (order) => order.status === "Enviado",
  ).length;
  const deliveredOrders = mockOrders.filter(
    (order) => order.status === "Entregue",
  ).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pedidos"
        description="Acompanhe e gerencie os pedidos recebidos pela sua loja."
      />

      {/* Resumo dos pedidos */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-text-secondary">Total de pedidos</p>
            <ShoppingBag size={18} className="text-text-secondary" />
          </div>
          <p className="mt-3 text-2xl font-bold text-text">{totalOrders}</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-text-secondary">Pendentes</p>
            <Clock3 size={18} className="text-yellow-600" />
          </div>
          <p className="mt-3 text-2xl font-bold text-text">{pendingOrders}</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-text-secondary">Enviados</p>
            <Truck size={18} className="text-violet-600" />
          </div>
          <p className="mt-3 text-2xl font-bold text-text">{shippedOrders}</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-text-secondary">Entregues</p>
            <CheckCircle2 size={18} className="text-green-600" />
          </div>
          <p className="mt-3 text-2xl font-bold text-text">{deliveredOrders}</p>
        </Card>
      </div>

      {/* Listagem */}
      <Card className="overflow-hidden">
        <div className="space-y-4 border-b border-border p-4 sm:p-5">
          <div>
            <h2 className="font-semibold text-text">Todos os pedidos</h2>
            <p className="mt-1 text-sm text-text-secondary">
              Consulte os pedidos e seus respectivos status.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search
                size={17}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
              />
              <Input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por pedido ou cliente..."
                className="pl-9"
              />
            </div>

            <select
              value={selectedStatus}
              onChange={(event) =>
                setSelectedStatus(
                  event.target.value as (typeof statusOptions)[number],
                )
              }
              className="rounded-md border border-border bg-white px-3 py-2 text-sm text-text outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              aria-label="Filtrar por status"
            >
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status === "Todos" ? "Todos os status" : status}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-background-secondary text-text-secondary">
              <tr>
                <th className="px-5 py-3 font-medium">Pedido</th>
                <th className="px-5 py-3 font-medium">Cliente</th>
                <th className="px-5 py-3 font-medium">Data</th>
                <th className="px-5 py-3 font-medium">Itens</th>
                <th className="px-5 py-3 font-medium">Total</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 text-right font-medium">Ações</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-border">
              {filteredOrders.map((order) => (
                <tr
                  key={order.id}
                  className="transition-colors hover:bg-background"
                >
                  <td className="whitespace-nowrap px-5 py-4 font-medium text-text">
                    {order.id}
                  </td>

                  <td className="whitespace-nowrap px-5 py-4 text-text">
                    {order.customer}
                  </td>

                  <td className="whitespace-nowrap px-5 py-4 text-text-secondary">
                    {order.date}
                  </td>

                  <td className="px-5 py-4 text-text-secondary">
                    {order.items}
                  </td>

                  <td className="whitespace-nowrap px-5 py-4 font-medium text-text">
                    {formatCurrency(order.total)}
                  </td>

                  <td className="px-5 py-4">
                    <Badge className={getStatusStyle(order.status)}>
                      <span className="inline-flex items-center gap-1">
                        {getStatusIcon(order.status)}
                        {order.status}
                      </span>
                    </Badge>
                  </td>

                  <td className="px-5 py-4 text-right">
                    <Button
                      variant="outline"
                      onClick={() =>
                        navigate(`/store/pedidos/${order.id}`)
                      }
                    >
                      <Eye size={15} className="mr-2" />
                      Detalhes
                    </Button>
                  </td>
                </tr>
              ))}

              {filteredOrders.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-5 py-12 text-center text-text-secondary"
                  >
                    <ShoppingBag
                      size={28}
                      className="mx-auto mb-3 text-muted"
                    />
                    <p className="font-medium text-text">
                      Nenhum pedido encontrado
                    </p>
                    <p className="mt-1 text-sm">
                      Tente alterar a busca ou o filtro de status.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="border-t border-border px-5 py-3">
          <p className="text-xs text-text-secondary">
            Exibindo {filteredOrders.length} de {totalOrders} pedidos
          </p>
        </div>
      </Card>
    </div>
  );
}