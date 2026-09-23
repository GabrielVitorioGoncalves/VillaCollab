import { useState } from "react";

import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { FormField } from "../../components/ui/formField";
import { Input } from "../../components/ui/input";
import { Price } from "../../components/marketplace/price";

type PaymentMethod = "pix" | "credit-card";

const orderItems = [
  {
    id: "1",
    name: "Tênis Casual Urbano",
    storeName: "Urban Store",
    quantity: 1,
    price: 199.9,
  },
  {
    id: "2",
    name: "Camiseta Oversized",
    storeName: "Urban Store",
    quantity: 2,
    price: 89.9,
  },
  {
    id: "3",
    name: "Mochila Minimalista",
    storeName: "Urban Store",
    quantity: 1,
    price: 149.9,
  },
];

export function PaymentPage() {
  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>("pix");

  const subtotal = orderItems.reduce(
    (total, item) =>
      total + item.price * item.quantity,
    0
  );

  const shipping = 0;
  const total = subtotal + shipping;

  const handlePayment = () => {
    console.log("Pagamento:", {
      paymentMethod,
      total,
    });
  };

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-[1240px] px-5 py-10">
        {/* Cabeçalho */}
        <section className="mb-8">
          <h1 className="text-3xl font-bold text-text">
            Pagamento
          </h1>

          <p className="mt-1 text-sm text-text-secondary">
            Preencha seus dados e escolha a forma de pagamento.
          </p>
        </section>

        <section
          className="
            grid
            gap-8
            lg:grid-cols-[minmax(0,1fr)_360px]
            lg:items-start
          "
        >
          {/* Conteúdo principal */}
          <div className="space-y-6">

            {/* Endereço de entrega */}
            <Card className="p-6">
              <div>
                <h2 className="text-lg font-semibold text-text">
                  Endereço de entrega
                </h2>

                <p className="mt-1 text-sm text-text-secondary">
                  Informe os dados do endereço onde deseja receber
                  seu pedido.
                </p>
              </div>

              <div className="mt-6 space-y-5">
                {/* Nome */}
                <FormField
                  label="Nome completo"
                  required
                >
                  <Input
                    placeholder="Digite seu nome completo"
                  />
                </FormField>

                {/* CEP */}
                <div className="grid gap-5 sm:grid-cols-[180px_1fr]">
                  <FormField
                    label="CEP"
                    required
                  >
                    <Input
                      placeholder="00000-000"
                    />
                  </FormField>

                  <FormField
                    label="Rua"
                    required
                  >
                    <Input
                      placeholder="Nome da rua"
                    />
                  </FormField>
                </div>

                {/* Número e complemento */}
                <div className="grid gap-5 sm:grid-cols-[180px_1fr]">
                  <FormField
                    label="Número"
                    required
                  >
                    <Input
                      placeholder="Número"
                    />
                  </FormField>

                  <FormField
                    label="Complemento"
                  >
                    <Input
                      placeholder="Apartamento, bloco, casa..."
                    />
                  </FormField>
                </div>

                {/* Bairro */}
                <FormField
                  label="Bairro"
                  required
                >
                  <Input
                    placeholder="Digite o bairro"
                  />
                </FormField>

                {/* Cidade e estado */}
                <div className="grid gap-5 sm:grid-cols-2">
                  <FormField
                    label="Cidade"
                    required
                  >
                    <Input
                      placeholder="Digite a cidade"
                    />
                  </FormField>

                  <FormField
                    label="Estado"
                    required
                  >
                    <Input
                      placeholder="UF"
                      maxLength={2}
                    />
                  </FormField>
                </div>
              </div>
            </Card>

            {/* Forma de pagamento */}
            <Card className="p-6">
              <div>
                <h2 className="text-lg font-semibold text-text">
                  Forma de pagamento
                </h2>

                <p className="mt-1 text-sm text-text-secondary">
                  Selecione como deseja pagar seu pedido.
                </p>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {/* PIX */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod("pix")}
                  className={`
                    rounded-xl
                    border
                    p-4
                    text-left
                    transition-colors
                    ${
                      paymentMethod === "pix"
                        ? "border-primary bg-background-secondary"
                        : "border-border bg-surface hover:bg-background-secondary"
                    }
                  `}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`
                        flex
                        h-5
                        w-5
                        items-center
                        justify-center
                        rounded-full
                        border
                        ${
                          paymentMethod === "pix"
                            ? "border-primary"
                            : "border-border"
                        }
                      `}
                    >
                      {paymentMethod === "pix" && (
                        <div className="h-2.5 w-2.5 rounded-full bg-primary" />
                      )}
                    </div>

                    <div>
                      <p className="font-medium text-text">
                        PIX
                      </p>

                      <p className="mt-0.5 text-xs text-text-secondary">
                        Pagamento instantâneo
                      </p>
                    </div>
                  </div>
                </button>

                {/* Cartão */}
                <button
                  type="button"
                  onClick={() =>
                    setPaymentMethod("credit-card")
                  }
                  className={`
                    rounded-xl
                    border
                    p-4
                    text-left
                    transition-colors
                    ${
                      paymentMethod === "credit-card"
                        ? "border-primary bg-background-secondary"
                        : "border-border bg-surface hover:bg-background-secondary"
                    }
                  `}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`
                        flex
                        h-5
                        w-5
                        items-center
                        justify-center
                        rounded-full
                        border
                        ${
                          paymentMethod === "credit-card"
                            ? "border-primary"
                            : "border-border"
                        }
                      `}
                    >
                      {paymentMethod === "credit-card" && (
                        <div className="h-2.5 w-2.5 rounded-full bg-primary" />
                      )}
                    </div>

                    <div>
                      <p className="font-medium text-text">
                        Cartão de crédito
                      </p>

                      <p className="mt-0.5 text-xs text-text-secondary">
                        Visa, Mastercard e outros
                      </p>
                    </div>
                  </div>
                </button>
              </div>
            </Card>

            {/* PIX */}
            {paymentMethod === "pix" && (
              <Card className="p-6">
                <div>
                  <h2 className="text-lg font-semibold text-text">
                    Pagamento via PIX
                  </h2>

                  <p className="mt-1 text-sm text-text-secondary">
                    Após confirmar o pedido, um QR Code será
                    disponibilizado para pagamento.
                  </p>
                </div>

                <div className="mt-6 flex flex-col items-center rounded-xl border border-border bg-background-secondary px-6 py-10">
                  <div className="flex h-40 w-40 items-center justify-center rounded-lg border border-border bg-white">
                    <span className="text-xs text-text-secondary">
                      QR Code
                    </span>
                  </div>

                  <p className="mt-5 text-center text-sm font-medium text-text">
                    QR Code para pagamento
                  </p>

                  <p className="mt-1 max-w-sm text-center text-xs text-text-secondary">
                    O código será gerado após a confirmação da
                    compra.
                  </p>
                </div>
              </Card>
            )}

            {/* Cartão de crédito */}
            {paymentMethod === "credit-card" && (
              <Card className="p-6">
                <div>
                  <h2 className="text-lg font-semibold text-text">
                    Dados do cartão
                  </h2>

                  <p className="mt-1 text-sm text-text-secondary">
                    Informe os dados do seu cartão de crédito.
                  </p>
                </div>

                <div className="mt-6 space-y-5">
                  <FormField
                    label="Número do cartão"
                    required
                  >
                    <Input
                      placeholder="0000 0000 0000 0000"
                    />
                  </FormField>

                  <FormField
                    label="Nome impresso no cartão"
                    required
                  >
                    <Input
                      placeholder="Nome completo"
                    />
                  </FormField>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <FormField
                      label="Validade"
                      required
                    >
                      <Input placeholder="MM/AA" />
                    </FormField>

                    <FormField
                      label="CVV"
                      required
                    >
                      <Input
                        placeholder="000"
                        type="password"
                      />
                    </FormField>
                  </div>

                  <FormField
                    label="Número de parcelas"
                    required
                  >
                    <select
                      defaultValue="1"
                      className="
                        w-full
                        rounded-lg
                        border
                        border-border
                        bg-surface
                        px-4
                        py-3
                        text-sm
                        text-text
                        outline-none
                        transition-colors
                        focus:border-primary
                      "
                    >
                      <option value="1">
                        1x de R$ {total.toFixed(2)}
                      </option>

                      <option value="2">
                        2x de R$ {(total / 2).toFixed(2)}
                      </option>

                      <option value="3">
                        3x de R$ {(total / 3).toFixed(2)}
                      </option>

                      <option value="4">
                        4x de R$ {(total / 4).toFixed(2)}
                      </option>

                      <option value="5">
                        5x de R$ {(total / 5).toFixed(2)}
                      </option>

                      <option value="6">
                        6x de R$ {(total / 6).toFixed(2)}
                      </option>
                    </select>
                  </FormField>
                </div>
              </Card>
            )}
          </div>

          {/* Resumo */}
          <aside className="lg:sticky lg:top-24">
            <Card className="p-5">
              <h2 className="text-lg font-semibold text-text">
                Resumo do pedido
              </h2>

              <div className="mt-5 space-y-4">
                {orderItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start justify-between gap-4"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-text">
                        {item.name}
                      </p>

                      <p className="mt-1 text-xs text-text-secondary">
                        {item.quantity}{" "}
                        {item.quantity === 1
                          ? "unidade"
                          : "unidades"}
                      </p>
                    </div>

                    <Price
                      value={item.price * item.quantity}
                      size="sm"
                    />
                  </div>
                ))}

                <div className="border-t border-border pt-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-text-secondary">
                      Subtotal
                    </span>

                    <Price
                      value={subtotal}
                      size="sm"
                    />
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-sm text-text-secondary">
                      Frete
                    </span>

                    <span className="text-sm font-medium text-text">
                      Grátis
                    </span>
                  </div>
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

                <Button
                  className="mt-2 w-full"
                  onClick={handlePayment}
                >
                  {paymentMethod === "pix"
                    ? "Gerar pagamento PIX"
                    : "Finalizar pagamento"}
                </Button>

                <p className="text-center text-xs text-text-secondary">
                  Ao finalizar, você confirma seu pedido e
                  concorda com as condições da compra.
                </p>
              </div>
            </Card>
          </aside>
        </section>
      </div>
    </main>
  );
}