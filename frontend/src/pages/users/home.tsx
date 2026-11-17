import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { Pagination } from "../../components/marketplace/pagination";
import { StoreGrid } from "../../components/marketplace/storeGrid";
import type { Store } from "../../components/marketplace/storeCard";
import { RequestStatus } from "../../components/ui/requestStatus";
import { useRequest } from "../../hooks/useRequest";
import { toStoreCard } from "../../lib/catalog";
import { listStoresPage } from "../../lib/services";

const LOJAS_POR_PAGINA = 12;

export function Home() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const search = (searchParams.get("busca") ?? "").trim();

  const [paginaAtual, setPaginaAtual] = useState({ busca: search, pagina: 1 });
  const pagina = paginaAtual.busca === search ? paginaAtual.pagina : 1;

  const { data, loading, error, reload } = useRequest(
    `lojas:${search}:${pagina}`,
    () => listStoresPage(pagina, LOJAS_POR_PAGINA, search),
    { manterAnterior: true }
  );

  const stores = useMemo<Store[]>(() => (data?.itens ?? []).map(toStoreCard), [data]);
  const totalPaginas = data ? Math.max(1, Math.ceil(data.total / LOJAS_POR_PAGINA)) : 1;

  const mudarPagina = (novaPagina: number) => {
    setPaginaAtual({ busca: search, pagina: novaPagina });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleViewStore = (store: Store) => {
    navigate(`/user/paginaLoja/${store.id}`);
  };

  return (
    <main className="min-h-screen bg-background">
      {/* Banner */}
      <section
        className="
          h-[150px]
          w-full
          overflow-hidden
          border-b
          border-border
          bg-surface
          sm:h-[180px]
        "
      >
        <picture className="block h-full w-full">
          <source media="(max-width: 639px)" srcSet="/banner-home-celular.png" />
          <img
            src="/banner-home.png"
            alt="Villa Collab, marketplace de lojas locais"
            className="h-full w-full object-cover"
          />
        </picture>
      </section>

      <div className="mx-auto w-full max-w-[1353px] px-5 py-7">
        {/* Lojas */}
        <section>
          <div className="mb-5">
            <h1 className="text-2xl font-bold text-text">
              {search ? `Lojas para "${search}"` : "Lojas"}
            </h1>

            <p className="mt-1 text-sm text-text-secondary">
              Encontre produtos de diferentes lojas em um só lugar.
            </p>
          </div>

          {!data && (loading || error) ? (
            <RequestStatus
              loading={loading}
              error={error}
              onRetry={reload}
              loadingText="Carregando lojas..."
            />
          ) : (
            <>
              {error && (
                <p role="alert" className="mb-4 text-sm text-danger">
                  {error}
                </p>
              )}
              <StoreGrid
                stores={stores}
                onViewStore={handleViewStore}
                emptyMessage={
                  search
                    ? `Nenhuma loja encontrada para "${search}".`
                    : "Nenhuma loja cadastrada ainda."
                }
              />
              <div className="mt-8">
                <Pagination currentPage={pagina} totalPages={totalPaginas} onPageChange={mudarPagina} />
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
