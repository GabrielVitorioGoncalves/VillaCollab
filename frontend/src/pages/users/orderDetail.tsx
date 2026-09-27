import { useNavigate, useParams } from "react-router-dom";

import { ProductImage } from "../../components/marketplace/productImage";
import { Price } from "../../components/marketplace/price";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";

type OrderStatus =
  | "delivered"
  | "processing"
  | "shipped"
  | "cancelled";

interface OrderProduct {
  id: string;
  name: string;
  image?: string;
  quantity: number;
  price: number;
}

interface Order {
  id: string;
  storeName: string;
  date: string;
  status: OrderStatus;
  products: OrderProduct[];
  shipping: number;
  paymentMethod: "pix" | "credit-card";
  address: {
    name: string;
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    cep: string;
  };
}

const orders: Order[] = [
  {
    id: "1001",
    storeName: "Urban Store",
    date: "23 de setembro de 2026",
    status: "delivered",
    products: [
      {
        id: "1",
        name: "Tênis Casual Urbano",
        image: "",
        quantity: 1,
        price: 199.9,
      },
      {
        id: "2",
        name: "Camiseta Oversized",
        image: "",
        quantity: 2,
        price: 89.9,
      },
      {
        id: "3",
        name: "Mochila Minimalista",
        image: "",
        quantity: 1,
        price: 149.9,
      },
    ],
    shipping: 0,
    paymentMethod: "pix",
    address: {
      name: "Lucas Leal",
      street: "Rua Exemplo",
      number: "123",
      complement: "Apartamento 202",
      neighborhood: "Centro",
      city: "Joinville",
      state: "SC",
      cep: "89200-000",
    },
  },
  {
    id: "1002",
    storeName: "Tech House",
    date: "18 de setembro de 2026",
    status: "shipped",
    products: [
      {
        id: "4",
        name: "Mouse Gamer G403",
        image: "",
        quantity: 1,
        price: 249.9,
      },
    ],
    shipping: 0,
    paymentMethod: "credit-card",
    address: {
      name: "Lucas Leal",
      street: "Rua Exemplo",
      number: "123",
      neighborhood: "Centro",
      city: "Joinville",
      state: "SC",
      cep: "89200-000",
    },
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

export function OrderDetail() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const order = orders.find(
    (currentOrder) => currentOrder.id === id
  );

  if (!order) {
    return (
      <main className="min-h-screen bg-background">
        <div className="mx-auto w-full max-w-[1240px] px-5 py-10">
          <Card className="p-10">
            <div className="text-center">
              <h1 className="text-xl font-semibold text-text">
                Pedido não encontrado
              </h1>

              <p className="mt-2 text-sm text-text-secondary">
                O pedido informado não existe ou não está mais
                disponível.
              </p>

              <Button
                className="mt-6"
                variant="outline"
                onClick={() => navigate("/pedidos")}
              >
                Voltar para pedidos
              </Button>
            </div>
          </Card>
        </div>
      </main>
    );
  }

  const status = statusConfig[order.status];

  const subtotal = order.products.reduce(
    (total, product) =>
      total + product.price * product.quantity,
    0
  );

  const total = subtotal + order.shipping;

  const paymentLabel =
    order.paymentMethod === "pix"
      ? "PIX"
      : "Cartão de crédito";

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-[1240px] px-5 py-10">
        {/* Voltar */}
        <button
          type="button"
          onClick={() => navigate("/user/pedidos")}
          className="
            mb-6
            text-sm
            font-medium
            text-text
            transition-opacity
            hover:opacity-60
          "
        >
          ← Voltar para pedidos
        </button>

        {/* Cabeçalho */}
        <section className="mb-8">
          <div
            className="
              flex
              flex-col
              gap-4
              sm:flex-row
              sm:items-center
              sm:justify-between
            "
          >
            <div>
              <h1 className="text-3xl font-bold text-text">
                Pedido {order.id} - {order.storeName}
              </h1>

              <p className="mt-2 text-sm text-text-secondary">
                Realizado em {order.date}
              </p>
            </div>

            <Badge variant={status.variant}>
              {status.label}
            </Badge>
          </div>
        </section>

        <div
          className="
            grid
            gap-6
            lg:grid-cols-[minmax(0,1fr)_360px]
            lg:items-start
          "
        >
          {/* Conteúdo principal */}
          <div className="space-y-6">
            {/* Produtos */}
            <Card className="p-6">
              <div>
                <h2 className="text-lg font-semibold text-text">
                  Produtos
                </h2>

                <p className="mt-1 text-sm text-text-secondary">
                  {order.products.length}{" "}
                  {order.products.length === 1
                    ? "produto"
                    : "produtos"}{" "}
                  neste pedido
                </p>
              </div>

              <div className="mt-6 divide-y divide-border">
                {order.products.map((product) => {
                  const productSubtotal =
                    product.price * product.quantity;

                  return (
                    <div
                      key={product.id}
                      className="
                        flex
                        gap-4
                        py-5
                        first:pt-0
                        last:pb-0
                      "
                    >
                      <div className="w-24 shrink-0">
                        <ProductImage
                          image={product.image}
                          alt={product.name}
                          className="rounded-lg"
                        />
                      </div>

                      <div className="flex min-w-0 flex-1 flex-col justify-between gap-3 sm:flex-row sm:items-center">
                        <div>
                          <h3 className="font-medium text-text">
                            {product.name}
                          </h3>

                          <p className="mt-1 text-sm text-text-secondary">
                            Quantidade: {product.quantity}
                          </p>

                          <div className="mt-2">
                            <Price
                              value={product.price}
                              size="sm"
                            />
                          </div>
                        </div>

                        <div className="text-left sm:text-right">
                          <p className="text-xs text-text-secondary">
                            Subtotal
                          </p>

                          <div className="mt-1">
                            <Price
                              value={productSubtotal}
                              size="sm"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Endereço */}
            <Card className="p-6">
              <div>
                <h2 className="text-lg font-semibold text-text">
                  Endereço de entrega
                </h2>

                <p className="mt-1 text-sm text-text-secondary">
                  Endereço utilizado neste pedido.
                </p>
              </div>

              <div className="mt-5 rounded-xl border border-border bg-background-secondary p-4">
                <p className="font-medium text-text">
                  {order.address.name}
                </p>

                <p className="mt-2 text-sm text-text-secondary">
                  {order.address.street},{" "}
                  {order.address.number}
                </p>

                {order.address.complement && (
                  <p className="mt-1 text-sm text-text-secondary">
                    {order.address.complement}
                  </p>
                )}

                <p className="mt-1 text-sm text-text-secondary">
                  {order.address.neighborhood}
                </p>

                <p className="mt-1 text-sm text-text-secondary">
                  {order.address.city} -{" "}
                  {order.address.state}
                </p>

                <p className="mt-1 text-sm text-text-secondary">
                  CEP {order.address.cep}
                </p>
              </div>
            </Card>

            {/* Pagamento */}
            <Card className="p-6">
              <div>
                <h2 className="text-lg font-semibold text-text">
                  Forma de pagamento
                </h2>

                <p className="mt-1 text-sm text-text-secondary">
                  Método utilizado para realizar o pagamento.
                </p>
              </div>

              <div className="mt-5 rounded-xl border border-border bg-background-secondary p-4">
                <p className="font-medium text-text">
                  {paymentLabel}
                </p>

                <p className="mt-1 text-sm text-text-secondary">
                  Pagamento referente ao pedido {order.id}.
                </p>
              </div>
            </Card>
          </div>

          {/* Resumo */}
          <aside className="lg:sticky lg:top-24">
            <Card className="p-5">
              <h2 className="text-lg font-semibold text-text">
                Resumo do pedido
              </h2>

              <div className="mt-5 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-secondary">
                    Subtotal
                  </span>

                  <Price
                    value={subtotal}
                    size="sm"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-secondary">
                    Frete
                  </span>

                  {order.shipping === 0 ? (
                    <span className="text-sm font-medium text-text">
                      Grátis
                    </span>
                  ) : (
                    <Price
                      value={order.shipping}
                      size="sm"
                    />
                  )}
                </div>

                <div className="border-t border-border pt-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-text">
                      Total
                    </span>

                    <Price
                      value={total}
                      size="lg"
                    />
                  </div>
                </div>
              </div>
            </Card>
          </aside>
        </div>
      </div>
    </main>
  );
}