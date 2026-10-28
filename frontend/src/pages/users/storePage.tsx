import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Star } from "lucide-react";

import {
  ProductCard,
  type Product,
} from "../../components/marketplace/productCard";

import {
  ProductFilters,
  type ProductFilter,
} from "../../components/marketplace/productFilters";

import {
  SortSelect,
  type SortOption,
} from "../../components/marketplace/sortSelect";

import { Pagination } from "../../components/marketplace/pagination";

import {
  StoreFilterSidebar,
} from "../../components/marketplace/storeFilterSideBar";

import { RequestStatus } from "../../components/ui/requestStatus";
import { useCart } from "../../contexts/cartContext";
import { useRequest } from "../../hooks/useRequest";
import { promotionOf, ratingOf, toStoreFilters } from "../../lib/catalog";
import { formatCurrency, isUuid, toNumber } from "../../lib/format";
import { getStore, listStoreProducts } from "../../lib/services";

interface Store {
  name: string;
  category?: string;
  description?: string;
  banner_url?: string;
  logo_url?: string;
  rating?: number;
}

interface StoreProduct extends Product {
  createdAt?: string;

  filterValues?: Record<string, string[]>;
}

/* =========================================================
   FILTROS GERAIS
   ========================================================= */

const productFilters: ProductFilter[] = [
  {
    id: "all",
    label: "Todos",
  },
  {
    id: "available",
    label: "Disponíveis",
  },
  {
    id: "discount",
    label: "Em promoção",
  },
];

/* =========================================================
   ORDENAÇÃO
   ========================================================= */

const sortOptions: SortOption[] = [
  {
    value: "relevance",
    label: "Mais relevantes",
  },
  {
    value: "price-asc",
    label: "Menor preço",
  },
  {
    value: "price-desc",
    label: "Maior preço",
  },
  {
    value: "newest",
    label: "Mais recentes",
  },
];

const PRODUCTS_PER_PAGE = 9;

async function loadStore(id: string) {
  if (!isUuid(id)) throw new Error("Loja não encontrada.");
  const [loja, produtos] = await Promise.all([getStore(id), listStoreProducts(id)]);
  return { loja, produtos };
}

/* =========================================================
   PÁGINA
   ========================================================= */

export function StorePage() {
  const { id = "" } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addItem } = useCart();

  const { data, loading, error, reload } = useRequest(`loja:${id}`, () => loadStore(id));

  const [search, setSearch] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [sort, setSort] = useState("relevance");
  const [currentPage, setCurrentPage] = useState(1);

  const [selectedFilters, setSelectedFilters] =
    useState<Record<string, string[]>>({});

  const store: Store | null = data
    ? {
        name: data.loja.nome,
        category: data.loja.categoria ?? undefined,
        description: data.loja.descricao ?? undefined,
        banner_url: data.loja.banner_url ?? undefined,
        logo_url: data.loja.logo_url ?? undefined,
        rating: ratingOf(data.loja)?.rating,
      }
    : null;

  const storeFilters = useMemo(
    () => (data ? toStoreFilters(data.loja) : []),
    [data]
  );

  const products = useMemo<StoreProduct[]>(
    () =>
      (data?.produtos ?? []).map((produto) => ({
        id: produto.id,
        name: produto.nome,
        image: produto.imagens?.[0],
        price: toNumber(produto.preco),
        ...promotionOf(produto),
        storeName: data?.loja.nome ?? "",
        category: produto.categoria ?? undefined,
        available: produto.estoque > 0 && data?.loja.aceita_pedidos !== false && data?.loja.ativa !== false,
        createdAt: produto.created_at,
        filterValues: produto.filtros ?? {},
      })),
    [data]
  );

  /* =======================================================
     FILTRAGEM E ORDENAÇÃO
     ======================================================= */

  const filteredProducts = useMemo(() => {
    let result = [...products];

    /* -------------------------------------------------------
       Busca
       ------------------------------------------------------- */

    if (search.trim()) {
      const searchTerm = search.trim().toLowerCase();

      result = result.filter((product) => {
        return (
          product.name.toLowerCase().includes(searchTerm) ||
          product.category?.toLowerCase().includes(searchTerm)
        );
      });
    }

    /* -------------------------------------------------------
       Filtros gerais
       ------------------------------------------------------- */

    if (selectedFilter === "available") {
      result = result.filter((product) => product.available);
    }

    if (selectedFilter === "discount") {
      result = result.filter(
        (product) =>
          product.discount !== undefined && product.discount > 0
      );
    }

    /* -------------------------------------------------------
       Filtros personalizados da loja
       ------------------------------------------------------- */

    Object.entries(selectedFilters).forEach(
      ([filterId, selectedOptions]) => {
        if (selectedOptions.length === 0) {
          return;
        }

        result = result.filter((product) => {
          const productOptions =
            product.filterValues?.[filterId] ?? [];

          /*
           * Se o produto possuir pelo menos uma das opções
           * selecionadas, ele continua aparecendo.
           */
          return selectedOptions.some((option) =>
            productOptions.includes(option)
          );
        });
      }
    );

    /* -------------------------------------------------------
       Ordenação
       ------------------------------------------------------- */

    if (sort === "relevance") {
      result.sort(
        (a, b) =>
          Number(b.available) - Number(a.available) ||
          a.name.localeCompare(b.name, "pt-BR")
      );
    }

    if (sort === "price-asc") {
      result.sort((a, b) => a.price - b.price);
    }

    if (sort === "price-desc") {
      result.sort((a, b) => b.price - a.price);
    }

    if (sort === "newest") {
      result.sort((a, b) => {
        if (!a.createdAt || !b.createdAt) {
          return 0;
        }

        return (
          new Date(b.createdAt).getTime() -
          new Date(a.createdAt).getTime()
        );
      });
    }

    return result;
  }, [products, search, selectedFilter, selectedFilters, sort]);

  /* =======================================================
     PAGINAÇÃO
     ======================================================= */

  const totalPages = Math.ceil(
    filteredProducts.length / PRODUCTS_PER_PAGE
  );

  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * PRODUCTS_PER_PAGE;

    return filteredProducts.slice(
      start,
      start + PRODUCTS_PER_PAGE
    );
  }, [filteredProducts, currentPage]);

  /* =======================================================
     HANDLERS
     ======================================================= */

  function handleSearch(value: string) {
    setSearch(value);
    setCurrentPage(1);
  }

  function handleFilterChange(filterId: string) {
    setSelectedFilter(filterId);
    setCurrentPage(1);
  }

  function handleSortChange(value: string) {
    setSort(value);
    setCurrentPage(1);
  }

  function handleStoreFilterChange(
    filterId: string,
    optionId: string
  ) {
    setSelectedFilters((current) => {
      const currentOptions = current[filterId] ?? [];

      const filter = storeFilters.find(
        (item) => item.id === filterId
      );

      if (!filter) {
        return current;
      }

      /* -----------------------------------------------------
         Radio
         ----------------------------------------------------- */

      if (filter.type === "radio") {
        const alreadySelected =
          currentOptions.includes(optionId);

        return {
          ...current,
          [filterId]: alreadySelected ? [] : [optionId],
        };
      }

      /* -----------------------------------------------------
         Checkbox
         ----------------------------------------------------- */

      const alreadySelected =
        currentOptions.includes(optionId);

      const newOptions = alreadySelected
        ? currentOptions.filter((id) => id !== optionId)
        : [...currentOptions, optionId];

      return {
        ...current,
        [filterId]: newOptions,
      };
    });

    setCurrentPage(1);
  }

  function clearStoreFilters() {
    setSelectedFilters({});
    setCurrentPage(1);
  }

  function clearFilters() {
    setSearch("");
    setSelectedFilter("all");
    setSort("relevance");
    setSelectedFilters({});
    setCurrentPage(1);
  }

  function handleViewProduct(product: Product) {
    navigate(`/user/detalhesProduto/${product.id}`);
  }

  function handleAddToCart(product: Product) {
    const produto = data?.produtos.find((item) => item.id === product.id);
    if (!produto || !data) return;

    if ((produto.variacoes ?? []).length > 0) {
      handleViewProduct(product);
      return;
    }

    if (data.loja.aceita_pedidos === false || data.loja.ativa === false) return;

    addItem(produto, data.loja.nome, 1);
  }

  /* =======================================================
     RENDER
     ======================================================= */

  if (loading || error || !store) {
    return (
      <main className="min-h-screen bg-background">
        <div className="mx-auto w-full max-w-[1240px] px-5 py-8">
          <RequestStatus
            loading={loading}
            error={error ?? "Loja não encontrada."}
            onRetry={isUuid(id) ? reload : undefined}
            loadingText="Carregando loja..."
          />
        </div>
      </main>
    );
  }

return (
  <main className="min-h-screen bg-background">
    <div className="mx-auto w-full max-w-[1240px] px-5 py-8">

      {/* Banner */}
      <section
        className="
          h-[220px]
          overflow-hidden
          rounded-xl
          bg-background-secondary
        "
      >
        {store.banner_url ? (
          <img
            src={store.banner_url}
            alt={`Banner da ${store.name}`}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <span className="text-3xl font-medium text-text-secondary">
              Banner da loja
            </span>
          </div>
        )}
      </section>

      {/* Informações da loja */}
      <section className="mt-7">

          {/* Informações */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-text">
                {store.name}
              </h1>

              {store.rating !== undefined && (
                <div className="flex items-center gap-1 text-sm text-text-secondary">
                  <Star
                    size={16}
                    fill="currentColor"
                  />

                  <span>
                    {store.rating.toFixed(1)}
                  </span>
                </div>
              )}
            </div>

            {store.category && (
              <p className="mt-1 text-sm text-text-secondary">
                {store.category}
              </p>
            )}

            {store.description && (
              <p className="mt-1 max-w-2xl text-sm text-text-secondary">
                {store.description}
              </p>
            )}

            {data && (data.loja.prazo_preparo_dias != null || toNumber(data.loja.pedido_minimo) > 0) && (
              <p className="mt-2 text-xs text-text-secondary">
                {[
                  data.loja.prazo_preparo_dias != null
                    ? data.loja.prazo_preparo_dias === 0
                      ? "Pedidos preparados no mesmo dia"
                      : `Prazo de preparo: até ${data.loja.prazo_preparo_dias} ${data.loja.prazo_preparo_dias === 1 ? "dia" : "dias"}`
                    : "",
                  toNumber(data.loja.pedido_minimo) > 0
                    ? `Pedido mínimo: ${formatCurrency(data.loja.pedido_minimo)}`
                    : "",
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            )}

            {data?.loja.ativa === false ? (
              <p
                role="status"
                className="mt-3 inline-block rounded-md border border-yellow-200 bg-yellow-50 px-3 py-2 text-sm text-yellow-800"
              >
                Esta loja está fora do marketplace no momento e não recebe pedidos.
              </p>
            ) : data?.loja.aceita_pedidos === false && (
              <p
                role="status"
                className="mt-3 inline-block rounded-md border border-yellow-200 bg-yellow-50 px-3 py-2 text-sm text-yellow-800"
              >
                Esta loja não está recebendo pedidos no momento.
              </p>
            )}
          </div>
      </section>

      {/* Produtos */}
      <section className="mt-10">

        {/* Caixa principal */}
        <div
          className="
            overflow-hidden
            rounded-[22px]
            border
            border-border
            bg-surface
            p-6
            shadow-[0px_2px_8px_rgba(0,0,0,0.03)]
            lg:p-8
          "
        >

          {/* Cabeçalho da caixa */}
          <div
            className="
              flex
              flex-col
              gap-4
              border-b
              border-border
              pb-5
              lg:flex-row
              lg:items-center
              lg:justify-between
            "
          >
            {/* Quantidade */}
            <div>
              <p className="text-sm font-medium text-text">
                {filteredProducts.length}{" "}
                {filteredProducts.length === 1
                  ? "produto encontrado"
                  : "produtos encontrados"}
              </p>
            </div>

            {/* Ordenação */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-text-secondary">
                Classificar por:
              </span>

              <SortSelect
                options={sortOptions}
                value={sort}
                onChange={handleSortChange}
                className="w-[180px]"
              />
            </div>
          </div>

          {/* Conteúdo */}
          <div
            className="
              mt-6
              flex
              flex-col
              gap-8
              lg:flex-row
            "
          >

            {storeFilters.length > 0 && (
              <StoreFilterSidebar
                filters={storeFilters}
                selectedFilters={selectedFilters}
                onChange={handleStoreFilterChange}
                onClear={clearStoreFilters}
              />
            )}

            {/* Área dos produtos */}
            <div className="min-w-0 flex-1">

              {/* Busca */}
              <div className="mb-5">
                <div className="relative w-full">
                  <input
                    type="text"
                    value={search}
                    onChange={(event) =>
                      handleSearch(event.target.value)
                    }
                    placeholder="Buscar produtos..."
                    className="
                      h-11
                      w-full
                      rounded-lg
                      border
                      border-border
                      bg-surface
                      px-4
                      text-sm
                      text-text
                      outline-none
                      transition-colors
                      placeholder:text-text-secondary
                      focus:border-primary
                    "
                  />
                </div>
              </div>

              {/* Filtros gerais */}
              <div className="mb-6">
                <ProductFilters
                  filters={productFilters}
                  selectedFilter={selectedFilter}
                  onSelect={handleFilterChange}
                />
              </div>

              {/* Nenhum produto */}
              {paginatedProducts.length === 0 ? (
                <div
                  className="
                    rounded-xl
                    bg-background
                    p-10
                    text-center
                  "
                >
                  {products.length === 0 ? (
                    <>
                      <h3 className="text-lg font-semibold text-text">
                        Esta loja ainda não tem produtos
                      </h3>

                      <p className="mt-2 text-sm text-text-secondary">
                        Volte mais tarde para ver as novidades.
                      </p>
                    </>
                  ) : (
                    <>
                      <h3 className="text-lg font-semibold text-text">
                        Nenhum produto encontrado
                      </h3>

                      <p className="mt-2 text-sm text-text-secondary">
                        Tente alterar sua busca ou os filtros.
                      </p>

                      <button
                        type="button"
                        onClick={clearFilters}
                        className="
                          mt-4
                          text-sm
                          font-medium
                          text-text
                          underline
                          transition-opacity
                          hover:opacity-60
                        "
                      >
                        Limpar filtros
                      </button>
                    </>
                  )}
                </div>
              ) : (

                /* Grid de produtos */
                <div
                  className="
                    grid
                    grid-cols-1
                    gap-6
                    sm:grid-cols-2
                    lg:grid-cols-3
                  "
                >
                  {paginatedProducts.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onView={handleViewProduct}
                      onAddToCart={handleAddToCart}
                    />
                  ))}
                </div>
              )}

              {/* Paginação */}
              {totalPages > 1 && (
                <div className="mt-8">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  </main>
)};
