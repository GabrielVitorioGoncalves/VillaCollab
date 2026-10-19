import { Link } from "react-router-dom";
import { Price } from "../../components/marketplace/price";
import { OrderStatusBadge } from "../../components/orders/orderStatusBadge";
import { Card } from "../../components/ui/card";
import { RequestState } from "../../components/ui/requestState";
import { useApiResource } from "../../hooks/useApiResource";
import type { Loja, Pedido } from "../../types/api";

export function MyOrders() {
  const orders = useApiResource<Pedido[]>("/pedidos/meus", true);
  const shops = useApiResource<Loja[]>("/lojas");

  return <main className="min-h-screen bg-background">
    <div className="mx-auto w-full max-w-[1240px] px-5 py-10">
      <h1 className="text-3xl font-bold">Histórico de pedidos</h1>
      <p className="mt-2 text-sm text-text-secondary">Consulte seus pedidos e acompanhe a confirmação das lojas.</p>
      <RequestState {...orders} onRetry={orders.reload} />
      {orders.data && <section className="mt-8 space-y-4">
        {!orders.data.length && <Card className="p-10 text-center"><h2 className="text-xl font-semibold">Nenhum pedido encontrado</h2>
          <Link to="/user/home" className="mt-4 inline-block underline">Explorar lojas</Link></Card>}
        {orders.data.map(order => <Card key={order.id} className="p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div><h2 className="font-semibold">Pedido {order.id.slice(0, 8)} · {shops.data?.find(shop => shop.id === order.loja_id)?.nome || "Loja"}</h2>
              <p className="mt-2 text-sm text-text-secondary">{new Date(order.created_at).toLocaleString("pt-BR")} · {order.itens_pedido.reduce((sum, item) => sum + item.quantidade, 0)} item(ns)</p></div>
            <OrderStatusBadge status={order.status} />
          </div>
          <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
            <Price value={Number(order.total)} /><Link to={`/user/pedidos/${order.id}`} className="rounded-lg border border-border px-4 py-2 text-sm">Ver pedido</Link>
          </div>
        </Card>)}
      </section>}
    </div>
  </main>;
}
