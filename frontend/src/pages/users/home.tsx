import { useNavigate, useSearchParams } from "react-router-dom";
import { StoreGrid } from "../../components/marketplace/storeGrid";
import { RequestState } from "../../components/ui/requestState";
import { useApiResource } from "../../hooks/useApiResource";
import type { Loja } from "../../types/api";

export function Home() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const search = params.get("busca") || "";
  const resource = useApiResource<Loja[]>("/lojas");
  const stores = (resource.data || []).filter(store =>
    `${store.nome} ${store.descricao || ""}`.toLocaleLowerCase("pt-BR").includes(search.toLocaleLowerCase("pt-BR")),
  ).map(store => ({ id: store.id, name: store.nome, description: store.descricao || undefined }));

  return <main className="min-h-screen bg-background">
    <div className="mx-auto w-full max-w-[1240px] px-5 py-8">
      <section className="rounded-[22px] bg-background-secondary px-7 py-12 sm:px-10">
        <p className="text-sm font-medium text-text-secondary">VillaCollab Marketplace</p>
        <h1 className="mt-3 text-3xl font-bold text-text">Encontre sua próxima descoberta.</h1>
        <p className="mt-3 max-w-xl text-text-secondary">Conheça as lojas da nossa comunidade e escolha seus produtos em um só lugar.</p>
      </section>
      <section className="mt-8">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div><h2 className="text-2xl font-bold text-text">Lojas</h2>
            <p className="mt-1 text-sm text-text-secondary">Explore o catálogo de cada loja.</p></div>
          <label className="text-sm text-text-secondary">Buscar lojas
            <input type="search" value={search} onChange={event => setParams(event.target.value ? { busca: event.target.value } : {})}
              className="ml-3 rounded-lg border border-border bg-white px-3 py-2 text-text" />
          </label>
        </div>
        <RequestState {...resource} onRetry={resource.reload} />
        {resource.data && <StoreGrid stores={stores} onViewStore={store => navigate(`/user/paginaLoja/${store.id}`)}
          emptyMessage={search ? "Nenhuma loja corresponde à busca." : "Nenhuma loja cadastrada ainda."} />}
      </section>
    </div>
  </main>;
}
