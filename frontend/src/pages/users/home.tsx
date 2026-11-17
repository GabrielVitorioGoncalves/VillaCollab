import { useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { StoreGrid } from "../../components/marketplace/storeGrid";
import type { Store } from "../../components/marketplace/storeCard";
import { RequestStatus } from "../../components/ui/requestStatus";
import { useRequest } from "../../hooks/useRequest";
import { toStoreCard } from "../../lib/catalog";
import { listStores } from "../../lib/services";

export function Home() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const search = (searchParams.get("busca") ?? "").trim();

  const { data, loading, error, reload } = useRequest("lojas", listStores);

  const stores = useMemo<Store[]>(() => {
    const term = search.toLowerCase();

    return (data ?? [])
      .filter(
        (loja) =>
          !term ||
          loja.nome.toLowerCase().includes(term) ||
          loja.descricao?.toLowerCase().includes(term) ||
          loja.categoria?.toLowerCase().includes(term)
      )
      .map(toStoreCard);
  }, [data, search]);

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

          {loading || error ? (
            <RequestStatus
              loading={loading}
              error={error}
              onRetry={reload}
              loadingText="Carregando lojas..."
            />
          ) : (
            <StoreGrid
              stores={stores}
              onViewStore={handleViewStore}
              emptyMessage={
                search
                  ? `Nenhuma loja encontrada para "${search}".`
                  : "Nenhuma loja cadastrada ainda."
              }
            />
          )}
        </section>
      </div>
    </main>
  );
}
