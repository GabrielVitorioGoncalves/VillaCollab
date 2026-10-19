import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ProductCard } from "../../components/marketplace/productCard";
import { RequestState } from "../../components/ui/requestState";
import { useCart } from "../../contexts/cart-context";
import { useApiResource } from "../../hooks/useApiResource";
import type { Loja, Produto } from "../../types/api";

export function StorePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const shop = useApiResource<Loja>(id ? `/lojas/${encodeURIComponent(id)}` : null);
  const catalog = useApiResource<Produto[]>(id ? `/produtos/loja/${encodeURIComponent(id)}` : null);
  const cart = useCart();
  const [search, setSearch] = useState("");
  const [available, setAvailable] = useState(false);
  const [sort, setSort] = useState("newest");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const products = (catalog.data || []).filter(product =>
    (!available || product.estoque > 0) && `${product.nome} ${product.descricao || ""}`.toLocaleLowerCase("pt-BR")
      .includes(search.toLocaleLowerCase("pt-BR")),
  ).sort((a, b) => sort === "price-asc" ? Number(a.preco) - Number(b.preco)
    : sort === "price-desc" ? Number(b.preco) - Number(a.preco) : b.created_at.localeCompare(a.created_at));

  function add(product: Produto) {
    setError(""); setNotice("");
    try {
      cart.add(product, shop.data!.nome);
      setNotice(`${product.nome} adicionado ao carrinho.`);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Não foi possível adicionar o produto."); }
  }

  return <main className="min-h-screen bg-background">
    <div className="mx-auto w-full max-w-[1240px] px-5 py-8">
      <Link to="/user/home" className="text-sm underline">← Voltar para lojas</Link>
      <RequestState loading={shop.loading || catalog.loading} error={shop.error || catalog.error}
        onRetry={() => { shop.reload(); catalog.reload(); }} />
      {shop.data && catalog.data && <>
        <section className="mt-6 rounded-[22px] bg-background-secondary p-8">
          <h1 className="text-3xl font-bold text-text">{shop.data.nome}</h1>
          {shop.data.descricao && <p className="mt-3 max-w-2xl text-text-secondary">{shop.data.descricao}</p>}
        </section>
        <section className="mt-8 rounded-[22px] border border-border bg-white p-5 sm:p-7">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-border pb-5">
            <h2 className="text-xl font-semibold">Produtos ({products.length})</h2>
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <input type="search" aria-label="Buscar produtos" placeholder="Buscar produtos..." value={search}
                onChange={event => setSearch(event.target.value)} className="rounded-lg border border-border px-3 py-2" />
              <label className="flex items-center gap-2"><input type="checkbox" checked={available}
                onChange={event => setAvailable(event.target.checked)} />Só disponíveis</label>
              <select aria-label="Ordenar produtos" value={sort} onChange={event => setSort(event.target.value)}
                className="rounded-lg border border-border px-3 py-2">
                <option value="newest">Mais recentes</option><option value="price-asc">Menor preço</option>
                <option value="price-desc">Maior preço</option>
              </select>
            </div>
          </div>
          {notice && <p role="status" className="mb-5 text-sm text-success">{notice} <Link className="underline" to="/user/carrinho">Ver carrinho</Link></p>}
          {error && <p role="alert" className="mb-5 text-sm text-danger">{error}</p>}
          {cart.persistenceError && <p role="alert" className="mb-5 text-sm text-warning">{cart.persistenceError}</p>}
          {products.length ? <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {products.map(product => <ProductCard key={product.id}
              product={{ id: product.id, name: product.nome, price: Number(product.preco), storeName: shop.data!.nome, available: product.estoque > 0 }}
              onView={() => navigate(`/user/detalhesProduto/${product.id}`)} onAddToCart={() => add(product)} />)}
          </div> : <p className="py-10 text-center text-text-secondary">Nenhum produto encontrado.</p>}
        </section>
      </>}
    </div>
  </main>;
}
