import { Link, useParams } from "react-router-dom";
import { Price } from "../../components/marketplace/price";
import { OrderStatusBadge } from "../../components/orders/orderStatusBadge";
import { Card } from "../../components/ui/card";
import { RequestState } from "../../components/ui/requestState";
import { useApiResource } from "../../hooks/useApiResource";
import type { Loja, Pedido, Produto } from "../../types/api";

export function OrderDetail() {
  const { id } = useParams();
  const resource = useApiResource<Pedido>(id ? `/pedidos/${encodeURIComponent(id)}` : null, true);
  const order = resource.data;
  const shop = useApiResource<Loja>(order ? `/lojas/${order.loja_id}` : null);
  const catalog = useApiResource<Produto[]>(order ? `/produtos/loja/${order.loja_id}` : null);

  return <main className="min-h-screen bg-background">
    <div className="mx-auto w-full max-w-[1240px] px-5 py-10">
      <Link to="/user/pedidos" className="text-sm underline">← Voltar para pedidos</Link>
      <RequestState {...resource} onRetry={resource.reload} />
      {order && <>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
          <div><h1 className="text-2xl font-bold">Pedido {order.id.slice(0, 8)}</h1>
            <p className="mt-2 text-text-secondary">{shop.data?.nome || "Loja"} · {new Date(order.created_at).toLocaleString("pt-BR")}</p></div>
          <OrderStatusBadge status={order.status} />
        </div>
        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <Card className="p-6"><h2 className="text-lg font-semibold">Produtos do pedido</h2>
            <ul className="mt-4 divide-y divide-border">{order.itens_pedido.map(item => <li key={item.id} className="flex flex-wrap justify-between gap-4 py-4">
              <div><p className="font-medium">{catalog.data?.find(product => product.id === item.produto_id)?.nome || `Produto ${item.produto_id.slice(0, 8)}`}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-text-secondary"><span>{item.quantidade} unidade(s) ·</span><Price value={Number(item.preco_unitario)} size="sm" /></div></div>
              <Price value={Number(item.subtotal)} />
            </li>)}</ul>
          </Card>
          <Card className="h-fit p-6"><h2 className="font-semibold">Total do pedido</h2><div className="mt-4"><Price value={Number(order.total)} size="lg" /></div>
            {order.status === "pendente" && <p className="mt-4 text-sm text-text-secondary">Pedido recebido. Aguarde a confirmação da loja.</p>}
            <Link to="/user/home" className="mt-5 inline-block text-sm underline">Continuar comprando</Link>
          </Card>
        </div>
      </>}
    </div>
  </main>;
}
