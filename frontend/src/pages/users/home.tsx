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
      <div className="mx-auto w-full max-w-[1353px] px-5 py-7">
        {/* Banner */}
        <section
          className="
            h-[271px]
            w-full
            overflow-hidden
            rounded-[22px]
            bg-background-secondary
          "
        >
          <div className="flex h-full items-center justify-center">
            <span className="text-4xl font-medium text-muted">
              Banner
            </span>
          </div>
        </section>

        {/* Lojas */}
        <section className="mt-8">
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
