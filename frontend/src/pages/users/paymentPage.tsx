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
import { createOrder, getMe, getOrderWhatsapp, listStores } from "../../lib/services";
import { linkWhatsappSeguro, telefoneWhatsappValido } from "../../lib/whatsapp";

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
    if (!telefoneWhatsappValido(loja.telefone)) {
      return [`A ${group.storeName} ainda não cadastrou o WhatsApp para receber pedidos. Remova os produtos dela para continuar.`];
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

    const janela = groups.length === 1 ? window.open("", "_blank") : null;
    if (janela) janela.opener = null;

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
          forma_pagamento: "whatsapp" as const,
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
        janela?.close();
        setError(prefix + errorMessage(caught));
        setSubmitting(false);
        return;
      }
    }

    if (janela) {
      const url = await getOrderWhatsapp(createdIds[0]).then((resposta) => linkWhatsappSeguro(resposta.url), () => null);
      if (url) janela.location.href = url;
      else janela.close();
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
            Confira o endereço de entrega e finalize o pedido pelo WhatsApp da loja.
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

            <Card className="p-6">
              <div>
                <h2 className="text-lg font-semibold text-text">
                  Pagamento pelo WhatsApp
                </h2>

                <p className="mt-1 text-sm text-text-secondary">
                  O pagamento é combinado direto com a loja, na conversa do WhatsApp.
                </p>
              </div>

              <ol className="mt-5 space-y-3 text-sm text-text">
                <li className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-background-secondary text-xs font-semibold">1</span>
                  <span>Você confirma o pedido aqui e os produtos ficam reservados.</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-background-secondary text-xs font-semibold">2</span>
                  <span>Abrimos o WhatsApp da loja com uma mensagem pronta: itens, total e endereço.</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-background-secondary text-xs font-semibold">3</span>
                  <span>Vocês combinam o pagamento e a loja confirma o pedido. O andamento aparece em Meus pedidos.</span>
                </li>
              </ol>

              {groups.length > 1 && (
                <p className="mt-5 rounded-lg border border-border bg-background-secondary px-4 py-3 text-xs text-text-secondary">
                  Seu carrinho tem produtos de {groups.length} lojas. Cada loja recebe um pedido, e você envia cada
                  um pelo WhatsApp a partir de Meus pedidos.
                </p>
              )}
            </Card>
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
                    {submitting ? "Enviando..." : "Finalizar pelo WhatsApp"}
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
