import { useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import { ProductImage } from "../../components/marketplace/productImage";
import { Price } from "../../components/marketplace/price";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { RequestStatus } from "../../components/ui/requestStatus";
import { useRequest } from "../../hooks/useRequest";
import { errorMessage } from "../../lib/api";
import { fetchCartProducts } from "../../lib/cart";
import { variantLabel } from "../../lib/catalog";
import {
  formatDate,
  isUuid,
  orderStatusConfig,
  shortOrderId,
  toNumber,
} from "../../lib/format";
import { cancelOrder, getOrder, getStore, rateProduct } from "../../lib/services";
import type { Loja, Pedido, PedidoStatus, Produto } from "../../types/api";

interface OrderData {
  pedido: Pedido;
  loja: Loja | null;
  produtos: Record<string, Produto | null>;
}

async function loadOrder(id: string): Promise<OrderData> {
  if (!isUuid(id)) throw new Error("Pedido não encontrado.");
  const pedido = await getOrder(id);
  const [loja, produtos] = await Promise.all([
    getStore(pedido.loja_id).catch(() => null),
    fetchCartProducts(pedido.itens_pedido.map((item) => item.produto_id)).catch(
      () => ({}) as Record<string, Produto | null>
    ),
  ]);
  return { pedido, loja, produtos };
}

const progressSteps: { status: PedidoStatus; label: string }[] = [
  { status: "pendente", label: "Pedido realizado" },
  { status: "aceito", label: "Aceito pela loja" },
  { status: "enviado", label: "Enviado" },
  { status: "concluido", label: "Concluído" },
];

export function OrderDetail() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id = "" } = useParams<{ id: string }>();
  const justCreated = !!(location.state as { createdCount?: number } | null)?.createdCount;

  const { data, loading, error, reload, mutate } = useRequest(`pedido:${id}`, () => loadOrder(id));

  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState("");

  if (loading) {
    return (
      <main className="min-h-screen bg-background">
        <div className="mx-auto w-full max-w-[1240px] px-5 py-10">
          <RequestStatus loading loadingText="Carregando pedido..." />
        </div>
      </main>
    );
  }

  if (!data) {
    const notFound = !isUuid(id) || error?.toLowerCase().includes("não encontrado");

    return (
      <main className="min-h-screen bg-background">
        <div className="mx-auto w-full max-w-[1240px] px-5 py-10">
          <Card className="p-10">
            <div className="text-center">
              <h1 className="text-xl font-semibold text-text">
                {notFound ? "Pedido não encontrado" : "Não foi possível carregar o pedido"}
              </h1>

              <p className="mt-2 text-sm text-text-secondary">
                {notFound
                  ? "O pedido informado não existe ou não está mais disponível."
                  : error}
              </p>

              <div className="mt-6 flex justify-center gap-3">
                {!notFound && (
                  <Button onClick={reload}>
                    Tentar de novo
                  </Button>
                )}

                <Button
                  variant="outline"
                  onClick={() => navigate("/user/pedidos")}
                >
                  Voltar para pedidos
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </main>
    );
  }

  const { pedido, loja, produtos } = data;
  const order = pedido;
  const storeName = loja?.nome ?? "Loja";
  const status = orderStatusConfig[order.status] ?? orderStatusConfig.pendente;
  const total = toNumber(order.total);
  const shipping = 0;
  const subtotal = total - shipping;
  const canCancel = order.status === "pendente";

  const paymentLabel =
    order.forma_pagamento === "pix"
      ? "PIX"
      : order.forma_pagamento === "cartao"
        ? `Cartão de crédito${order.parcelas && order.parcelas > 1 ? ` em ${order.parcelas}x` : " à vista"}`
        : "Não informada";

  const reachedIndex = progressSteps.findIndex((step) => step.status === order.status);

  const handleCancel = async () => {
    setCancelling(true);
    setCancelError("");
    try {
      const updated = await cancelOrder(order.id);
      mutate({ ...data, pedido: updated });
      setConfirmingCancel(false);
    } catch (caught) {
      setCancelError(errorMessage(caught));
    } finally {
      setCancelling(false);
    }
  };

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

        {justCreated && order.status === "pendente" && (
          <div
            role="status"
            className="mb-6 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"
          >
            Pedido enviado para a loja. Você pode acompanhar o andamento por aqui.
          </div>
        )}

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
                Pedido {shortOrderId(order.id)} - {storeName}
              </h1>

              <p className="mt-2 text-sm text-text-secondary">
                Realizado em {formatDate(order.created_at)}
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
                  {order.itens_pedido.length}{" "}
                  {order.itens_pedido.length === 1
                    ? "produto"
                    : "produtos"}{" "}
                  neste pedido
                </p>
              </div>

              <div className="mt-6 divide-y divide-border">
                {order.itens_pedido.map((item) => {
                  const product = produtos[item.produto_id];
                  const name = product?.nome ?? "Produto indisponível";

                  return (
                    <div
                      key={item.id}
                      className="
                        flex
                        flex-wrap
                        gap-4
                        py-5
                        first:pt-0
                        last:pb-0
                      "
                    >
                      <div className="w-24 shrink-0">
                        <ProductImage
                          image={product?.imagens?.[0]}
                          alt={name}
                          className="rounded-lg"
                        />
                      </div>

                      <div className="flex min-w-0 flex-1 flex-col justify-between gap-3 sm:flex-row sm:items-center">
                        <div>
                          <h3 className="font-medium text-text">
                            {product ? (
                              <button
                                type="button"
                                onClick={() =>
                                  navigate(`/user/detalhesProduto/${item.produto_id}`)
                                }
                                className="text-left transition-opacity hover:opacity-60"
                              >
                                {name}
                              </button>
                            ) : (
                              name
                            )}
                          </h3>

                          {item.variacoes && Object.keys(item.variacoes).length > 0 && (
                            <p className="mt-1 text-sm text-text">
                              {variantLabel(product?.variacoes, item.variacoes) ||
                                Object.values(item.variacoes).join(" · ")}
                            </p>
                          )}

                          <p className="mt-1 text-sm text-text-secondary">
                            Quantidade: {item.quantidade}
                          </p>

                          <div className="mt-2">
                            <Price
                              value={toNumber(item.preco_unitario)}
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
                              value={toNumber(item.subtotal)}
                              size="sm"
                            />
                          </div>
                        </div>
                      </div>

                      {order.status === "concluido" && product && (
                        <RateProduct productId={item.produto_id} />
                      )}
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

              {order.endereco_entrega ? (
                <div className="mt-5 rounded-xl border border-border bg-background-secondary p-4">
                  {order.endereco_entrega.nome && (
                    <p className="font-medium text-text">
                      {order.endereco_entrega.nome}
                    </p>
                  )}

                  <p className="mt-2 text-sm text-text-secondary">
                    {order.endereco_entrega.rua},{" "}
                    {order.endereco_entrega.numero}
                  </p>

                  {order.endereco_entrega.complemento && (
                    <p className="mt-1 text-sm text-text-secondary">
                      {order.endereco_entrega.complemento}
                    </p>
                  )}

                  <p className="mt-1 text-sm text-text-secondary">
                    {order.endereco_entrega.bairro}
                  </p>

                  <p className="mt-1 text-sm text-text-secondary">
                    {order.endereco_entrega.cidade} -{" "}
                    {order.endereco_entrega.estado}
                  </p>

                  <p className="mt-1 text-sm text-text-secondary">
                    CEP {order.endereco_entrega.cep}
                  </p>
                </div>
              ) : (
                <p className="mt-5 text-sm text-text-secondary">
                  Este pedido foi feito sem endereço de entrega.
                </p>
              )}
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
                  Pagamento referente ao pedido {shortOrderId(order.id)}.
                </p>
              </div>
            </Card>

            <Card className="p-6">
              <div>
                <h2 className="text-lg font-semibold text-text">
                  Andamento
                </h2>

                <p className="mt-1 text-sm text-text-secondary">
                  Atualizado em {formatDate(order.updated_at || order.created_at)}.
                </p>
              </div>

              <ol className="mt-5 space-y-3">
                {order.status === "cancelado" ? (
                  <>
                    <ProgressStep done label="Pedido realizado" />
                    <ProgressStep done danger label="Pedido cancelado" />
                  </>
                ) : (
                  progressSteps.map((step, index) => (
                    <ProgressStep
                      key={step.status}
                      done={index <= reachedIndex}
                      label={step.label}
                    />
                  ))
                )}
              </ol>
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

                  <span className="text-sm font-medium text-text">
                    Grátis
                  </span>
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

                {canCancel && (
                  <div className="border-t border-border pt-4">
                    {confirmingCancel ? (
                      <div className="space-y-3">
                        <p className="text-sm text-text">
                          Cancelar este pedido? Os produtos voltam para o estoque da loja.
                        </p>

                        <div className="flex gap-3">
                          <Button
                            variant="danger"
                            className="flex-1"
                            onClick={handleCancel}
                            disabled={cancelling}
                          >
                            {cancelling ? "Cancelando..." : "Sim, cancelar"}
                          </Button>

                          <Button
                            variant="outline"
                            className="flex-1"
                            onClick={() => setConfirmingCancel(false)}
                            disabled={cancelling}
                          >
                            Manter
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => setConfirmingCancel(true)}
                      >
                        Cancelar pedido
                      </Button>
                    )}

                    {cancelError && (
                      <p role="alert" className="mt-3 text-sm text-danger">
                        {cancelError}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </Card>
          </aside>
        </div>
      </div>
    </main>
  );
}

function ProgressStep({
  label,
  done,
  danger = false,
}: {
  label: string;
  done: boolean;
  danger?: boolean;
}) {
  return (
    <li className="flex items-center gap-3">
      <span
        className={`
          h-3
          w-3
          shrink-0
          rounded-full
          ${
            danger
              ? "bg-danger"
              : done
                ? "bg-primary"
                : "border border-border bg-surface"
          }
        `}
      />

      <span className={`text-sm ${done ? "font-medium text-text" : "text-text-secondary"}`}>
        {label}
      </span>
    </li>
  );
}

function RateProduct({ productId }: { productId: string }) {
  const [rating, setRating] = useState(0);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");

  const send = async (value: number) => {
    setSending(true);
    setMessage("");
    try {
      await rateProduct(productId, value);
      setRating(value);
      setMessage("Obrigado pela avaliação!");
    } catch (caught) {
      setMessage(errorMessage(caught));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex w-full flex-wrap items-center gap-3 sm:pl-28">
      <span className="text-sm text-text-secondary">
        {rating ? "Sua nota:" : "Avalie este produto:"}
      </span>

      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            type="button"
            disabled={sending}
            onClick={() => send(value)}
            aria-label={`Dar nota ${value}`}
            aria-pressed={rating === value}
            className={`
              text-xl
              leading-none
              transition-opacity
              hover:opacity-60
              disabled:cursor-not-allowed
              ${value <= rating ? "text-text" : "text-muted"}
            `}
          >
            ★
          </button>
        ))}
      </div>

      {message && (
        <span className="text-sm text-text-secondary">{message}</span>
      )}
    </div>
  );
}
