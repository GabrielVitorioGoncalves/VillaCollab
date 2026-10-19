import { useRef, useState } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { CartSummary } from "../../components/cart/cartSummary";
import { Price } from "../../components/marketplace/price";
import { Card } from "../../components/ui/card";
import { RequestState } from "../../components/ui/requestState";
import { useCart } from "../../contexts/cart-context";
import { useApiResource } from "../../hooks/useApiResource";
import { api, ApiError } from "../../lib/api";
import { orderBody, subtotal } from "../../lib/cart";
import type { Loja, Pedido, Produto } from "../../types/api";

export function PaymentPage() {
  const [params] = useSearchParams();
  const storeId = params.get("loja");
  const cart = useCart();
  const lines = cart.items.filter(line => line.product.loja_id === storeId);
  const shop = useApiResource<Loja>(storeId ? `/lojas/${encodeURIComponent(storeId)}` : null);
  const catalog = useApiResource<Produto[]>(storeId ? `/produtos/loja/${encodeURIComponent(storeId)}` : null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [createdId, setCreatedId] = useState<string | null>(null);
  const sending = useRef(false);
  const current = lines.map(line => ({ ...line, product: catalog.data?.find(product => product.id === line.product.id) || line.product }));
  const unavailable = lines.filter(line => {
    const product = catalog.data?.find(item => item.id === line.product.id);
    return !product || product.estoque < line.quantity;
  });
  const loading = shop.loading || catalog.loading;
  const canConfirm = !loading && !!shop.data && !!catalog.data && lines.length > 0 && lines.length <= 50 && !unavailable.length;

  async function confirm() {
    if (sending.current || !canConfirm || !storeId) return;
    sending.current = true; setBusy(true); setError("");
    const purchased = [...lines];
    try {
      const order = await api<Pedido>("/pedidos", { method: "POST", auth: true, body: orderBody(storeId, purchased) });
      if (!order?.id) throw new ApiError("Não foi possível confirmar a resposta do pedido.", 0);
      setCreatedId(order.id);
      cart.completeOrder(purchased);
    } catch (caught) {
      setError(caught instanceof ApiError && caught.status === 0
        ? "Não foi possível confirmar a resposta. Confira seus pedidos antes de tentar novamente."
        : caught instanceof Error ? caught.message : "Não foi possível confirmar o pedido.");
      if (caught instanceof ApiError && caught.status === 409) catalog.reload();
    } finally { sending.current = false; setBusy(false); }
  }

  if (createdId) return <Navigate to={`/user/pedidos/${createdId}`} replace />;
  if (!lines.length) return <Navigate to="/user/carrinho" replace />;

  return <main className="min-h-screen bg-background">
    <div className="mx-auto w-full max-w-[1240px] px-5 py-10">
      <Link to="/user/carrinho" className="text-sm underline">← Editar carrinho</Link>
      <h1 className="mt-5 text-3xl font-bold">Revisar pedido</h1>
      <p className="mt-2 text-text-secondary">Confira os itens antes de enviar seu pedido à loja.</p>
      <RequestState loading={loading} error={shop.error || catalog.error} onRetry={() => { shop.reload(); catalog.reload(); }} />
      {shop.data && catalog.data && <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Card className="p-6">
          <h2 className="text-xl font-semibold">{shop.data.nome}</h2>
          <ul className="mt-5 divide-y divide-border">{current.map(line => <li key={line.product.id} className="flex items-center justify-between gap-5 py-4">
            <div><p className="font-medium">{line.product.nome}</p><div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-text-secondary"><span>{line.quantity} unidade(s) ·</span><Price value={Number(line.product.preco)} size="sm" /></div></div>
            <Price value={subtotal([line])} />
          </li>)}</ul>
          {unavailable.length > 0 && <p role="alert" className="mt-5 text-sm text-danger">Estoque indisponível para: {unavailable.map(line => line.product.nome).join(", ")}. Volte ao carrinho e ajuste ou remova esses itens.</p>}
          {lines.length > 50 && <p role="alert" className="mt-5 text-danger">O pedido deve conter até 50 produtos diferentes.</p>}
          {error && <div role="alert" className="mt-5 space-y-3 text-sm"><p className="text-danger">{error}</p>
            <Link to="/user/pedidos" className="mr-5 underline">Ver meus pedidos</Link><Link to="/" className="underline">Entrar novamente</Link></div>}
        </Card>
        <aside><CartSummary subtotal={subtotal(current)} showShipping={false} disabled={!canConfirm || busy}
          checkoutLabel={busy ? "Confirmando..." : "Confirmar pedido"} onCheckout={confirm} />
          <p className="mt-3 text-xs text-text-secondary">O pedido ficará pendente até a confirmação da loja.</p></aside>
      </div>}
    </div>
  </main>;
}
