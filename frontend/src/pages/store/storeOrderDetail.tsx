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

type OrderStatus =
  | "Pendente"
  | "Confirmado"
  | "Enviado"
  | "Entregue"
  | "Cancelado";

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
}

interface Order {
  id: string;
  customer: string;
  email: string;
  phone: string;
  date: string;
  status: OrderStatus;
  paymentMethod: string;
  address: string;
  items: OrderItem[];
}

const mockOrders: Order[] = [
  {
    id: "PED-1024",
    customer: "Mariana Costa",
    email: "mariana@email.com",
    phone: "(47) 99999-1234",
    date: "20/10/2026 às 14:30",
    status: "Pendente",
    paymentMethod: "Cartão de crédito",
    address: "Rua das Palmeiras, 120 - Centro, Joinville/SC",
    items: [
      {
        id: "1",
        name: "Camiseta básica",
        quantity: 2,
        price: 59.95,
      },
      {
        id: "2",
        name: "Boné casual",
        quantity: 1,
        price: 70,
      },
    ],
  },
  {
    id: "PED-1023",
    customer: "Rafael Mendes",
    email: "rafael@email.com",
    phone: "(47) 98888-5678",
    date: "19/10/2026 às 10:15",
    status: "Confirmado",
    paymentMethod: "Pix",
    address: "Rua Blumenau, 450 - América, Joinville/SC",
    items: [
      {
        id: "3",
        name: "Tênis casual",
        quantity: 1,
        price: 79.9,
      },
    ],
  },
  {
    id: "PED-1022",
    customer: "Ana Oliveira",
    email: "ana@email.com",
    phone: "(47) 97777-4321",
    date: "19/10/2026 às 09:00",
    status: "Enviado",
    paymentMethod: "Cartão de crédito",
    address: "Rua XV de Novembro, 80 - Centro, Joinville/SC",
    items: [
      {
        id: "4",
        name: "Bolsa casual",
        quantity: 1,
        price: 149.5,
      },
      {
        id: "5",
        name: "Carteira",
        quantity: 2,
        price: 50,
      },
    ],
  },
];

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
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

  const order = mockOrders.find((item) => item.id === id);

  const [status, setStatus] = useState<OrderStatus>(
    order?.status ?? "Pendente",
  );

  if (!order) {
    return (
      <div className="space-y-5">
        <PageHeader
          title="Pedido não encontrado"
          description="Não encontramos um pedido com esse identificador."
        />

        <Card className="p-8 text-center">
          <Package className="mx-auto mb-3 text-muted" size={36} />
          <p className="text-sm text-text-secondary">
            Verifique o código do pedido e tente novamente.
          </p>

          <div className="mt-5">
            <Button onClick={() => navigate("/store/pedidos")}>
              <ArrowLeft size={16} className="mr-2" />
              Voltar aos pedidos
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const subtotal = order.items.reduce(
    (total, item) => total + item.price * item.quantity,
    0,
  );

  const shipping = 0;
  const total = subtotal + shipping;
  const totalItems = order.items.reduce(
    (quantity, item) => quantity + item.quantity,
    0,
  );

    function handleStatusChange(nextStatus: OrderStatus) {
    setStatus(nextStatus);

    console.log(
        `Pedido ${id}: status alterado para ${nextStatus}`,
    );
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
                onClick={() => handleStatusChange("Confirmado")}
              >
                <CheckCircle2 size={16} className="mr-2" />
                Confirmar pedido
              </Button>
            )}

            {status === "Confirmado" && (
              <Button onClick={() => handleStatusChange("Enviado")}>
                <Truck size={16} className="mr-2" />
                Marcar como enviado
              </Button>
            )}

            {status === "Enviado" && (
              <Button onClick={() => handleStatusChange("Entregue")}>
                <CheckCircle2 size={16} className="mr-2" />
                Marcar como entregue
              </Button>
            )}

            {(status === "Pendente" || status === "Confirmado") && (
              <Button
                variant="outline"
                onClick={() => handleStatusChange("Cancelado")}
              >
                <XCircle size={16} className="mr-2" />
                Cancelar pedido
              </Button>
            )}
          </div>
        </div>
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
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-background-secondary">
                      <Package size={22} className="text-text-secondary" />
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-text">
                        {item.name}
                      </p>
                      <p className="mt-1 text-xs text-text-secondary">
                        Quantidade: {item.quantity}
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold text-text">
                      {formatCurrency(item.price * item.quantity)}
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

            <p className="text-sm leading-6 text-text-secondary">
              {order.address}
            </p>
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
              <p className="mt-1 text-sm font-medium text-text">
                {order.id}
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}