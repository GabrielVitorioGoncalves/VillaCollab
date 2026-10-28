import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { FormField } from "../../components/ui/formField";
import { Input } from "../../components/ui/input";
import { Price } from "../../components/marketplace/price";
import { useCart } from "../../contexts/cartContext";
import { useRequest } from "../../hooks/useRequest";
import {
  formatCep,
  toAddressForm,
  toEndereco,
  validateAddress,
  type AddressErrors,
  type AddressForm,
} from "../../lib/address";
import { errorMessage } from "../../lib/api";
import { cartSubtotal, groupByStore, lineProblem } from "../../lib/cart";
import { formatCurrency, toNumber } from "../../lib/format";
import { createOrder, getMe, listStores } from "../../lib/services";

type PaymentMethod = "pix" | "credit-card";

function newUuid(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

const MAX_LINES_PER_ORDER = 50;

export function PaymentPage() {
  const navigate = useNavigate();
  const { lines, removeItems } = useCart();

  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>("pix");
  const [installments, setInstallments] = useState(1);

  const profile = useRequest("perfil-checkout", getMe);
  const [editedAddress, setEditedAddress] = useState<AddressForm | null>(null);
  const address = editedAddress ?? toAddressForm(profile.data?.endereco, profile.data?.nome);
  const [addressErrors, setAddressErrors] = useState<AddressErrors>({});

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const groups = groupByStore(lines);
  const subtotal = cartSubtotal(lines);

  const shipping = 0;
  const total = subtotal + shipping;

  const hasProblems = lines.some((line) => lineProblem(line, lines) !== undefined);
  const tooManyLines = groups.find((group) => group.lines.length > MAX_LINES_PER_ORDER);

  const stores = useRequest("lojas-checkout", listStores);
  const storeIssues = groups.flatMap((group) => {
    const loja = stores.data?.find((item) => item.id === group.storeId);
    if (!loja) {
      return stores.data
        ? [`A ${group.storeName} não está disponível no momento. Remova os produtos dela para continuar.`]
        : [];
    }
    if (loja.aceita_pedidos === false) {
      return [`A ${group.storeName} não está recebendo pedidos no momento. Remova os produtos dela para continuar.`];
    }
    const minimo = toNumber(loja.pedido_minimo);
    if (minimo > 0 && group.subtotal < minimo) {
      return [`O pedido mínimo da ${group.storeName} é ${formatCurrency(minimo)}. Faltam ${formatCurrency(minimo - group.subtotal)}.`];
    }
    return [];
  });

  const idempotencyKeys = useRef(new Map<string, { signature: string; key: string }>());
  const keyFor = (storeId: string, signature: string) => {
    const saved = idempotencyKeys.current.get(storeId);
    if (saved && saved.signature === signature) return saved.key;
    const key = newUuid();
    idempotencyKeys.current.set(storeId, { signature, key });
    return key;
  };

  const updateAddress = (field: keyof AddressForm, value: string) => {
    setEditedAddress({ ...address, [field]: field === "cep" ? formatCep(value) : value });
    setAddressErrors((current) => ({ ...current, [field]: undefined }));
    setError("");
  };

  const handlePayment = async () => {
    if (submitting) return;

    const errors = validateAddress(address, true);
    setAddressErrors(errors);
    if (Object.keys(errors).length > 0) {
      setError("Confira o endereço de entrega.");
      return;
    }

    setSubmitting(true);
    setError("");

    const endereco = { ...toEndereco(address, true), nome: address.nome.trim() };
    const createdIds: string[] = [];

    for (const group of groups) {
      try {
        const itens = group.lines.map((line) => ({
          produto_id: line.productId,
          quantidade: line.quantity,
          ...(line.variants && Object.keys(line.variants).length > 0
            ? { variacoes: line.variants }
            : {}),
        }));
        const options = {
          endereco_entrega: endereco,
          forma_pagamento: paymentMethod === "pix" ? ("pix" as const) : ("cartao" as const),
          ...(paymentMethod === "credit-card" ? { parcelas: installments } : {}),
        };
        const pedido = await createOrder(
          group.storeId,
          itens,
          options,
          keyFor(group.storeId, JSON.stringify([itens, options]))
        );
        idempotencyKeys.current.delete(group.storeId);
        createdIds.push(pedido.id);
        removeItems(group.lines.map((line) => line.key));
      } catch (caught) {
        const prefix =
          createdIds.length > 0
            ? `${createdIds.length === 1 ? "1 pedido foi criado" : `${createdIds.length} pedidos foram criados`}, mas o da ${group.storeName} falhou: `
            : `Não foi possível fechar o pedido da ${group.storeName}: `;
        setError(prefix + errorMessage(caught));
        setSubmitting(false);
        return;
      }
    }

    navigate(
      createdIds.length === 1 ? `/user/pedidos/${createdIds[0]}` : "/user/pedidos",
      { replace: true, state: { createdCount: createdIds.length } }
    );
  };

  if (lines.length === 0) {
    return (
      <main className="min-h-screen bg-background">
        <div className="mx-auto w-full max-w-[1240px] px-5 py-10">
          <Card className="p-10">
            <div className="text-center">
              <h1 className="text-xl font-semibold text-text">
                Não há nada para pagar
              </h1>

              <p className="mt-2 text-sm text-text-secondary">
                Seu carrinho está vazio.
              </p>

              <Button
                className="mt-6"
                variant="outline"
                onClick={() => navigate("/user/home")}
              >
                Ver lojas
              </Button>
            </div>
          </Card>
        </div>
      </main>
    );
  }

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
                  {profile.data?.endereco && !editedAddress
                    ? "Preenchemos com o endereço do seu perfil. Altere se quiser receber em outro lugar."
                    : "Informe os dados do endereço onde deseja receber seu pedido."}
                </p>
              </div>

              <div className="mt-6 space-y-5">
                {/* Nome */}
                <FormField
                  label="Nome completo"
                  required
                  error={addressErrors.nome}
                >
                  <Input
                    placeholder="Digite seu nome completo"
                    value={address.nome}
                    error={!!addressErrors.nome}
                    autoComplete="name"
                    onChange={(event) => updateAddress("nome", event.target.value)}
                  />
                </FormField>

                {/* CEP */}
                <div className="grid gap-5 sm:grid-cols-[180px_1fr]">
                  <FormField
                    label="CEP"
                    required
                    error={addressErrors.cep}
                  >
                    <Input
                      placeholder="00000-000"
                      value={address.cep}
                      error={!!addressErrors.cep}
                      inputMode="numeric"
                      autoComplete="postal-code"
                      onChange={(event) => updateAddress("cep", event.target.value)}
                    />
                  </FormField>

                  <FormField
                    label="Rua"
                    required
                    error={addressErrors.rua}
                  >
                    <Input
                      placeholder="Nome da rua"
                      value={address.rua}
                      error={!!addressErrors.rua}
                      autoComplete="address-line1"
                      onChange={(event) => updateAddress("rua", event.target.value)}
                    />
                  </FormField>
                </div>

                {/* Número e complemento */}
                <div className="grid gap-5 sm:grid-cols-[180px_1fr]">
                  <FormField
                    label="Número"
                    required
                    error={addressErrors.numero}
                  >
                    <Input
                      placeholder="Número"
                      value={address.numero}
                      error={!!addressErrors.numero}
                      onChange={(event) => updateAddress("numero", event.target.value)}
                    />
                  </FormField>

                  <FormField
                    label="Complemento"
                  >
                    <Input
                      placeholder="Apartamento, bloco, casa..."
                      value={address.complemento}
                      autoComplete="address-line2"
                      onChange={(event) => updateAddress("complemento", event.target.value)}
                    />
                  </FormField>
                </div>

                {/* Bairro */}
                <FormField
                  label="Bairro"
                  required
                  error={addressErrors.bairro}
                >
                  <Input
                    placeholder="Digite o bairro"
                    value={address.bairro}
                    error={!!addressErrors.bairro}
                    onChange={(event) => updateAddress("bairro", event.target.value)}
                  />
                </FormField>

                {/* Cidade e estado */}
                <div className="grid gap-5 sm:grid-cols-2">
                  <FormField
                    label="Cidade"
                    required
                    error={addressErrors.cidade}
                  >
                    <Input
                      placeholder="Digite a cidade"
                      value={address.cidade}
                      error={!!addressErrors.cidade}
                      autoComplete="address-level2"
                      onChange={(event) => updateAddress("cidade", event.target.value)}
                    />
                  </FormField>

                  <FormField
                    label="Estado"
                    required
                    error={addressErrors.estado}
                  >
                    <Input
                      placeholder="UF"
                      maxLength={2}
                      value={address.estado}
                      error={!!addressErrors.estado}
                      autoComplete="address-level1"
                      onChange={(event) => updateAddress("estado", event.target.value.toUpperCase())}
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

                <p className="mt-4 rounded-lg border border-border bg-background-secondary px-4 py-3 text-xs text-text-secondary">
                  A cobrança no cartão ainda não está ativa. Registramos só a forma de
                  pagamento e as parcelas; os dados do cartão não são enviados nem guardados.
                </p>

                <div className="mt-6 space-y-5">
                  <FormField
                    label="Número do cartão"
                    required
                  >
                    <Input
                      placeholder="0000 0000 0000 0000"
                      autoComplete="off"
                    />
                  </FormField>

                  <FormField
                    label="Nome impresso no cartão"
                    required
                  >
                    <Input
                      placeholder="Nome completo"
                      autoComplete="off"
                    />
                  </FormField>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <FormField
                      label="Validade"
                      required
                    >
                      <Input placeholder="MM/AA" autoComplete="off" />
                    </FormField>

                    <FormField
                      label="CVV"
                      required
                    >
                      <Input
                        placeholder="000"
                        type="password"
                        autoComplete="off"
                      />
                    </FormField>
                  </div>

                  <FormField
                    label="Número de parcelas"
                    required
                  >
                    <select
                      value={installments}
                      onChange={(event) => setInstallments(Number(event.target.value))}
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
                      {[1, 2, 3, 4, 5, 6].map((value) => (
                        <option key={value} value={value}>
                          {value}x de{" "}
                          {(total / value).toLocaleString("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          })}
                        </option>
                      ))}
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
                {lines.map((item) => (
                  <div
                    key={item.key}
                    className="flex items-start justify-between gap-4"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-text">
                        {item.name}
                      </p>

                      {item.variantLabel && (
                        <p className="mt-1 text-xs text-text-secondary">
                          {item.variantLabel}
                        </p>
                      )}

                      <p className="mt-1 text-xs text-text-secondary">
                        {item.quantity}{" "}
                        {item.quantity === 1
                          ? "unidade"
                          : "unidades"}
                        {groups.length > 1 && ` · ${item.storeName}`}
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

                {groups.length > 1 && (
                  <p className="text-xs text-text-secondary">
                    Produtos de {groups.length} lojas: cada loja recebe um pedido separado.
                  </p>
                )}

                {error && (
                  <p role="alert" className="text-sm text-danger">
                    {error}
                  </p>
                )}

                {hasProblems && (
                  <p className="text-sm text-danger">
                    Alguns produtos mudaram de estoque. Ajuste o carrinho antes
                    de confirmar.
                  </p>
                )}

                {tooManyLines && (
                  <p className="text-sm text-danger">
                    A {tooManyLines.storeName} aceita até {MAX_LINES_PER_ORDER}{" "}
                    itens por pedido.
                  </p>
                )}

                {storeIssues.map((issue) => (
                  <p key={issue} className="text-sm text-danger">
                    {issue}
                  </p>
                ))}

                {hasProblems || tooManyLines || storeIssues.length > 0 ? (
                  <Button
                    className="mt-2 w-full"
                    variant="outline"
                    onClick={() => navigate("/user/carrinho")}
                  >
                    Voltar ao carrinho
                  </Button>
                ) : (
                  <Button
                    className="mt-2 w-full"
                    onClick={handlePayment}
                    disabled={submitting || profile.loading}
                  >
                    {submitting
                      ? "Enviando..."
                      : paymentMethod === "pix"
                        ? "Gerar pagamento PIX"
                        : "Finalizar pagamento"}
                  </Button>
                )}

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
