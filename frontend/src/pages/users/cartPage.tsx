import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CartItem } from "../../components/cart/cartItem";
import { CartSummary } from "../../components/cart/cartSummary";
import { Price } from "../../components/marketplace/price";
import { Card } from "../../components/ui/card";
import { useCart } from "../../contexts/cart-context";
import { maxQuantity, subtotal } from "../../lib/cart";

export function CartPage() {
  const cart = useCart();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const stores = [...new Set(cart.items.map(line => line.product.loja_id))];

  function change(id: string, quantity: number) {
    setError("");
    try { cart.setQuantity(id, quantity); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Não foi possível alterar a quantidade."); }
  }

  return <main className="min-h-screen bg-background">
    <div className="mx-auto w-full max-w-[1240px] px-5 py-10">
      <h1 className="text-3xl font-bold text-text">Carrinho</h1>
      <p className="mt-2 text-sm text-text-secondary">Revise seus produtos. Os pedidos são separados por loja.</p>
      {error && <p role="alert" className="mt-4 text-danger">{error}</p>}
      {cart.persistenceError && <p role="alert" className="mt-4 text-warning">{cart.persistenceError}</p>}
      {!cart.items.length ? <Card className="mt-8 p-10 text-center">
        <h2 className="text-xl font-semibold">Seu carrinho está vazio</h2>
        <p className="mt-2 text-text-secondary">Adicione produtos de uma loja para continuar.</p>
        <Link to="/user/home" className="mt-6 inline-block rounded-lg bg-primary px-5 py-3 text-white">Continuar comprando</Link>
      </Card> : <>
        <div className="mt-8 space-y-8">{stores.map(storeId => {
          const lines = cart.items.filter(line => line.product.loja_id === storeId);
          return <section key={storeId} aria-label={`Carrinho da ${lines[0].storeName}`}
            className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
            <Card className="space-y-4 p-5">
              <h2 className="text-lg font-semibold"><Link to={`/user/paginaLoja/${storeId}`} className="hover:underline">{lines[0].storeName}</Link></h2>
              {lines.map(line => <CartItem key={line.product.id}
                product={{ id: line.product.id, name: line.product.nome, price: Number(line.product.preco), storeName: line.storeName }}
                quantity={line.quantity} maxQuantity={maxQuantity(line.product)}
                onQuantityChange={quantity => change(line.product.id, quantity)} onRemove={() => cart.remove(line.product.id)} />)}
            </Card>
            <aside><CartSummary subtotal={subtotal(lines)} showShipping={false} checkoutLabel="Revisar pedido"
              onCheckout={() => navigate(`/user/pagamento?loja=${storeId}`)} />
              <p className="mt-3 text-xs text-text-secondary">Os preços e o estoque serão conferidos na revisão.</p>
            </aside>
          </section>;
        })}</div>
        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-5">
          <Link to="/user/home" className="text-sm underline">← Continuar comprando</Link>
          <div className="flex items-center gap-3"><span>Total do carrinho ({cart.count} itens)</span><Price value={subtotal(cart.items)} size="lg" /></div>
        </div>
      </>}
    </div>
  </main>;
}
