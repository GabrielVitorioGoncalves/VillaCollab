import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Package,
  Truck,
  XCircle,
  MapPin,
  UserRound,
  CreditCard,
} from "lucide-react";

import { PageHeader } from "../../components/layout/pageHeader";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { RequestStatus } from "../../components/ui/requestStatus";
import { useRequest } from "../../hooks/useRequest";
import { ApiError, errorMessage } from "../../lib/api";
import { variantLabel } from "../../lib/catalog";
import { formatCurrency, formatDateTime, isUuid, shortOrderId, toNumber } from "../../lib/format";
import { getStoreOrder, updateOrderStatus } from "../../lib/services";
import type { PedidoLoja, PedidoStatus } from "../../types/api";

type OrderStatus =
  | "Pendente"
  | "Confirmado"
  | "Enviado"
  | "Entregue"
  | "Cancelado";

interface OrderItem {
  id: string;
  name: string;
  variant: string;
  image?: string;
  quantity: number;
  price: number;
  subtotal: number;
}

const statusFromDb: Record<PedidoStatus, OrderStatus> = {
  pendente: "Pendente",
  aceito: "Confirmado",
  enviado: "Enviado",
  concluido: "Entregue",
  cancelado: "Cancelado",
};

const statusToDb: Record<Exclude<OrderStatus, "Pendente">, Exclude<PedidoStatus, "pendente">> = {
  Confirmado: "aceito",
  Enviado: "enviado",
  Entregue: "concluido",
  Cancelado: "cancelado",
};

function paymentLabel(pedido: PedidoLoja) {
  if (pedido.forma_pagamento === "pix") return "Pix";
  if (pedido.forma_pagamento === "cartao") {
    return `Cartão de crédito${pedido.parcelas && pedido.parcelas > 1 ? ` em ${pedido.parcelas}x` : " à vista"}`;
  }
  return "Não informado";
}

function addressLines(pedido: PedidoLoja): string[] {
  const endereco = pedido.endereco_entrega;
  if (!endereco) return [];
  return [
    endereco.nome ?? "",
    `${endereco.rua}, ${endereco.numero}${endereco.complemento ? ` - ${endereco.complemento}` : ""}`,
    `${endereco.bairro}, ${endereco.cidade}/${endereco.estado}`,
    `CEP ${endereco.cep}`,
  ].filter(Boolean);
}

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
      return <Clock3 size={15} />;
    case "Confirmado":
      return <CheckCircle2 size={15} />;
    case "Enviado":
      return <Truck size={15} />;
    case "Entregue":
      return <CheckCircle2 size={15} />;
    case "Cancelado":
      return <XCircle size={15} />;
  }
}

export function OrderDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();

  const request = useRequest(`pedido-loja:${id}`, () =>
    isUuid(id) ? getStoreOrder(id) : Promise.reject(new ApiError("Pedido não encontrado", 404))
  );

  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState("");
  const [confirmCancel, setConfirmCancel] = useState(false);

  const pedido = request.data;

  if (!pedido) {
    if (request.loading) {
      return (
        <div className="space-y-5">
          <PageHeader title="Pedido" />
          <RequestStatus loading loadingText="Carregando pedido..." />
        </div>
      );
    }

    return (
      <div className="space-y-5">
        <PageHeader
          title="Pedido não encontrado"
          description={request.error ?? "Não encontramos um pedido com esse identificador."}
        />

        <Card className="p-8 text-center">
          <Package className="mx-auto mb-3 text-muted" size={36} />
          <p className="text-sm text-text-secondary">
            Verifique o código do pedido e tente novamente.
          </p>

          <div className="mt-5 flex justify-center gap-2">
            <Button onClick={() => navigate("/store/pedidos")}>
              <ArrowLeft size={16} className="mr-2" />
              Voltar aos pedidos
            </Button>
            <Button variant="outline" onClick={request.reload}>
              Tentar de novo
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const order = {
    id: `#${shortOrderId(pedido.id)}`,
    fullId: pedido.id,
    customer: pedido.cliente?.nome ?? "Cliente",
    email: pedido.cliente?.email ?? "Não informado",
    phone: pedido.cliente?.telefone ?? "Não informado",
    date: formatDateTime(pedido.created_at),
    paymentMethod: paymentLabel(pedido),
    address: addressLines(pedido),
    items: pedido.itens_pedido.map<OrderItem>((item) => ({
      id: item.id,
      name: item.produtos?.nome ?? "Produto removido",
      variant: variantLabel(item.produtos?.variacoes, item.variacoes) || Object.values(item.variacoes ?? {}).join(" · "),
      image: item.produtos?.imagens?.[0],
      quantity: item.quantidade,
      price: toNumber(item.preco_unitario),
      subtotal: toNumber(item.subtotal),
    })),
  };
  const status = statusFromDb[pedido.status];

  const subtotal = order.items.reduce((total, item) => total + item.subtotal, 0);

  const shipping = 0;
  const total = toNumber(pedido.total);
  const totalItems = order.items.reduce(
    (quantity, item) => quantity + item.quantity,
    0,
  );

  async function handleStatusChange(nextStatus: Exclude<OrderStatus, "Pendente">) {
    if (!pedido || saving) return;
    setSaving(true);
    setActionError("");
    try {
      const updated = await updateOrderStatus(pedido.id, statusToDb[nextStatus]);
      setConfirmCancel(false);
      request.mutate({ ...pedido, status: updated.status, updated_at: updated.updated_at });
    } catch (caught) {
      setActionError(errorMessage(caught));
      request.reload();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Pedido ${order.id}`}
        description={`Realizado em ${order.date}`}
        action={
          <Button
            variant="outline"
            onClick={() => navigate("/store/pedidos")}
          >
            <ArrowLeft size={16} className="mr-2" />
            Voltar
          </Button>
        }
      />

      {/* Status e ações */}
      <Card className="p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="mb-2 text-sm text-text-secondary">
              Status atual
            </p>

            <Badge className={getStatusStyle(status)}>
              <span className="inline-flex items-center gap-2">
                {getStatusIcon(status)}
                {status}
              </span>
            </Badge>
          </div>

          <div className="flex flex-wrap gap-2">
            {status === "Pendente" && (
              <Button
                disabled={saving}
                onClick={() => handleStatusChange("Confirmado")}
              >
                <CheckCircle2 size={16} className="mr-2" />
                Confirmar pedido
              </Button>
            )}

            {status === "Confirmado" && (
              <Button disabled={saving} onClick={() => handleStatusChange("Enviado")}>
                <Truck size={16} className="mr-2" />
                Marcar como enviado
              </Button>
            )}

            {status === "Enviado" && (
              <Button disabled={saving} onClick={() => handleStatusChange("Entregue")}>
                <CheckCircle2 size={16} className="mr-2" />
                Marcar como entregue
              </Button>
            )}

            {(status === "Pendente" || status === "Confirmado") && !confirmCancel && (
              <Button
                variant="outline"
                disabled={saving}
                onClick={() => setConfirmCancel(true)}
              >
                <XCircle size={16} className="mr-2" />
                Cancelar pedido
              </Button>
            )}
          </div>
        </div>

        {confirmCancel && (
          <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-4">
            <p className="text-sm text-red-700">
              Cancelar este pedido? Os itens voltam para o estoque e o cliente vê o pedido como cancelado.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button variant="danger" disabled={saving} onClick={() => handleStatusChange("Cancelado")}>
                Sim, cancelar pedido
              </Button>
              <Button variant="outline" disabled={saving} onClick={() => setConfirmCancel(false)}>
                Voltar
              </Button>
            </div>
          </div>
        )}

        {actionError && (
          <p role="alert" className="mt-4 text-sm text-danger">
            {actionError}
          </p>
        )}
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Itens do pedido */}
        <div className="space-y-6 lg:col-span-2">
          <Card className="overflow-hidden">
            <div className="border-b border-border p-5">
              <h2 className="font-semibold text-text">
                Itens do pedido
              </h2>
              <p className="mt-1 text-sm text-text-secondary">
                {totalItems} unidade(s) neste pedido
              </p>
            </div>

            <div className="divide-y divide-border">
              {order.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-4 p-5"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md bg-background-secondary">
                      {item.image ? (
                        <img src={item.image} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <Package size={22} className="text-text-secondary" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-text">
                        {item.name}
                      </p>
                      {item.variant && (
                        <p className="mt-1 text-xs text-text-secondary">
                          {item.variant}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-text-secondary">
                        Quantidade: {item.quantity}
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold text-text">
                      {formatCurrency(item.subtotal)}
                    </p>
                    <p className="mt-1 text-xs text-text-secondary">
                      {formatCurrency(item.price)} / unidade
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Cliente */}
          <Card className="p-5 sm:p-6">
            <div className="mb-5 flex items-center gap-2">
              <UserRound size={19} className="text-text-secondary" />
              <h2 className="font-semibold text-text">
                Dados do cliente
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <p className="text-xs text-text-secondary">Nome</p>
                <p className="mt-1 text-sm font-medium text-text">
                  {order.customer}
                </p>
              </div>

              <div>
                <p className="text-xs text-text-secondary">E-mail</p>
                <p className="mt-1 break-all text-sm font-medium text-text">
                  {order.email}
                </p>
              </div>

              <div>
                <p className="text-xs text-text-secondary">Telefone</p>
                <p className="mt-1 text-sm font-medium text-text">
                  {order.phone}
                </p>
              </div>
            </div>
          </Card>

          {/* Endereço */}
          <Card className="p-5 sm:p-6">
            <div className="mb-4 flex items-center gap-2">
              <MapPin size={19} className="text-text-secondary" />
              <h2 className="font-semibold text-text">
                Endereço de entrega
              </h2>
            </div>

            {order.address.length > 0 ? (
              <div className="text-sm leading-6 text-text-secondary">
                {order.address.map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>
            ) : (
              <p className="text-sm leading-6 text-text-secondary">
                Endereço não informado neste pedido.
              </p>
            )}
          </Card>
        </div>

        {/* Resumo */}
        <div className="space-y-6">
          <Card className="p-5 sm:p-6">
            <h2 className="mb-5 font-semibold text-text">
              Resumo financeiro
            </h2>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between gap-3">
                <span className="text-text-secondary">
                  Subtotal ({totalItems} itens)
                </span>
                <span className="font-medium text-text">
                  {formatCurrency(subtotal)}
                </span>
              </div>

              <div className="flex justify-between gap-3">
                <span className="text-text-secondary">Frete</span>
                <span className="font-medium text-text">
                  {shipping === 0 ? "Grátis" : formatCurrency(shipping)}
                </span>
              </div>

              <div className="border-t border-border pt-3">
                <div className="flex justify-between gap-3">
                  <span className="font-semibold text-text">Total</span>
                  <span className="text-lg font-bold text-text">
                    {formatCurrency(total)}
                  </span>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-5 sm:p-6">
            <div className="mb-4 flex items-center gap-2">
              <CreditCard size={19} className="text-text-secondary" />
              <h2 className="font-semibold text-text">
                Pagamento
              </h2>
            </div>

            <p className="text-sm text-text-secondary">
              Método de pagamento
            </p>
            <p className="mt-1 text-sm font-medium text-text">
              {order.paymentMethod}
            </p>

            <div className="mt-4 border-t border-border pt-4">
              <p className="text-sm text-text-secondary">
                Código do pedido
              </p>
              <p className="mt-1 break-all text-sm font-medium text-text" title={order.fullId}>
                {order.id}
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}