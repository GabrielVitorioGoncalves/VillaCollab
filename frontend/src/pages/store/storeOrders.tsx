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
import { RequestStatus } from "../../components/ui/requestStatus";
import { useRequest } from "../../hooks/useRequest";
import { formatCurrency, formatShortDate, shortOrderId, toNumber } from "../../lib/format";
import { listStoreOrders } from "../../lib/services";
import type { PedidoStatus } from "../../types/api";

type OrderStatus =
  | "Pendente"
  | "Confirmado"
  | "Enviado"
  | "Entregue"
  | "Cancelado";

interface Order {
  id: string;
  code: string;
  customer: string;
  email: string;
  date: string;
  items: number;
  total: number;
  status: OrderStatus;
}

const statusFromDb: Record<PedidoStatus, OrderStatus> = {
  pendente: "Pendente",
  aceito: "Confirmado",
  enviado: "Enviado",
  concluido: "Entregue",
  cancelado: "Cancelado",
};

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

export function Orders() {
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [selectedStatus, setSelectedStatus] =
    useState<(typeof statusOptions)[number]>("Todos");

  const request = useRequest("pedidos-da-loja", listStoreOrders);

  const orders = useMemo<Order[]>(
    () =>
      (request.data ?? []).map((pedido) => ({
        id: pedido.id,
        code: `#${shortOrderId(pedido.id)}`,
        customer: pedido.cliente?.nome ?? "Cliente",
        email: pedido.cliente?.email ?? "",
        date: formatShortDate(pedido.created_at),
        items: pedido.itens_pedido.reduce((total, item) => total + item.quantidade, 0),
        total: toNumber(pedido.total),
        status: statusFromDb[pedido.status],
      })),
    [request.data],
  );

  const filteredOrders = useMemo(() => {
    const term = search.trim().toLowerCase().replace(/^#/, "");

    return orders.filter((order) => {
      const matchesSearch =
        order.id.toLowerCase().includes(term) ||
        order.code.toLowerCase().includes(term) ||
        order.customer.toLowerCase().includes(term) ||
        order.email.toLowerCase().includes(term);

      const matchesStatus =
        selectedStatus === "Todos" || order.status === selectedStatus;

      return matchesSearch && matchesStatus;
    });
  }, [orders, search, selectedStatus]);

  const totalOrders = orders.length;
  const pendingOrders = orders.filter(
    (order) => order.status === "Pendente",
  ).length;
  const shippedOrders = orders.filter(
    (order) => order.status === "Enviado",
  ).length;
  const deliveredOrders = orders.filter(
    (order) => order.status === "Entregue",
  ).length;

  if (!request.data) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Pedidos"
          description="Acompanhe e gerencie os pedidos recebidos pela sua loja."
        />
        <RequestStatus
          loading={request.loading}
          error={request.error}
          onRetry={request.reload}
          loadingText="Carregando pedidos..."
        />
      </div>
    );
  }

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
                placeholder="Buscar por pedido, cliente ou e-mail..."
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
                    {order.code}
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
                      {totalOrders === 0 ? "Nenhum pedido ainda" : "Nenhum pedido encontrado"}
                    </p>
                    <p className="mt-1 text-sm">
                      {totalOrders === 0
                        ? "Os pedidos feitos na sua loja aparecem aqui."
                        : "Tente alterar a busca ou o filtro de status."}
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