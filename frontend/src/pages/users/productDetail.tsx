import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AddToCartButton } from "../../components/marketplace/addCartButton";
import { ProductGallery } from "../../components/marketplace/productGallery";
import { Price } from "../../components/marketplace/price";
import { QuantitySelector } from "../../components/marketplace/quantitySelector";
import { RequestState } from "../../components/ui/requestState";
import { useCart } from "../../contexts/cart-context";
import { useApiResource } from "../../hooks/useApiResource";
import { maxQuantity } from "../../lib/cart";
import type { Loja, Produto } from "../../types/api";

export function ProductDetail() {
  const { id } = useParams();
  const product = useApiResource<Produto>(id ? `/produtos/${encodeURIComponent(id)}` : null);
  const shop = useApiResource<Loja>(product.data ? `/lojas/${product.data.loja_id}` : null);
  const cart = useCart();
  const [selection, setSelection] = useState({ id: "", quantity: 1 });
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const quantity = selection.id === id ? selection.quantity : 1;
  const inCart = cart.items.find(line => line.product.id === id)?.quantity || 0;
  const remaining = product.data ? maxQuantity(product.data) - inCart : 0;

  function add() {
    if (!product.data || !shop.data) return;
    setNotice(""); setError("");
    try {
      cart.add(product.data, shop.data.nome, quantity);
      setSelection({ id: id!, quantity: 1 });
      setNotice("Produto adicionado ao carrinho.");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Não foi possível adicionar o produto."); }
  }

  return <main className="min-h-screen bg-background">
    <div className="mx-auto w-full max-w-[1240px] px-5 py-8">
      <Link to={product.data ? `/user/paginaLoja/${product.data.loja_id}` : "/user/home"} className="text-sm underline">← Voltar para a loja</Link>
      <RequestState loading={product.loading || shop.loading} error={product.error || shop.error}
        onRetry={() => { product.reload(); shop.reload(); }} />
      {product.data && shop.data && <section className="mt-7 grid gap-10 lg:grid-cols-2">
        <ProductGallery images={[]} alt={product.data.nome} />
        <div className="space-y-6">
          <Link to={`/user/paginaLoja/${shop.data.id}`} className="text-sm text-text-secondary underline">{shop.data.nome}</Link>
          <h1 className="text-3xl font-bold text-text">{product.data.nome}</h1>
          <Price value={Number(product.data.preco)} size="lg" />
          <p className="whitespace-pre-line text-text-secondary">{product.data.descricao || "Sem descrição disponível."}</p>
          <p className="text-sm text-text-secondary">{product.data.estoque} unidade(s) em estoque{inCart ? ` · ${inCart} no seu carrinho` : ""}</p>
          {remaining > 0 && <QuantitySelector value={quantity} max={remaining}
            onChange={value => setSelection({ id: id!, quantity: value })} />}
          <AddToCartButton available={remaining > 0 && quantity <= remaining} onClick={add} />
          {notice && <p role="status" className="text-sm text-success">{notice} <Link to="/user/carrinho" className="underline">Ver carrinho</Link></p>}
          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
          {cart.persistenceError && <p role="alert" className="text-sm text-warning">{cart.persistenceError}</p>}
        </div>
      </section>}
    </div>
  </main>;
}
