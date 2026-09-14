import { useMemo, useState } from "react";
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
  type StoreFilter,
} from "../../components/marketplace/storeFilterSideBar";

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

  /*
   * Filtros personalizados da loja.
   *
   * Exemplo:
   *
   * {
   *   size: ["m", "l"],
   *   color: ["black"]
   * }
   */
  filterValues?: Record<string, string[]>;
}

/* =========================================================
   DADOS MOCK DA LOJA
   ========================================================= */

const store: Store = {
  name: "Urban Store",
  category: "Moda",
  description:
    "Moda urbana e acessórios para quem busca estilo e personalidade.",
  banner_url: "",
};

/* =========================================================
   FILTROS PERSONALIZADOS DA LOJA
   ========================================================= */

const storeFilters: StoreFilter[] = [
  {
    id: "size",
    name: "Tamanho",
    type: "checkbox",
    options: [
      {
        id: "xxs",
        label: "XXS",
      },
      {
        id: "xs",
        label: "XS",
      },
      {
        id: "s",
        label: "S",
      },
      {
        id: "m",
        label: "M",
      },
      {
        id: "l",
        label: "L",
      },
      {
        id: "xl",
        label: "XL",
      },
    ],
  },
  {
    id: "color",
    name: "Cor",
    type: "radio",
    options: [
      {
        id: "black",
        label: "Preto",
      },
      {
        id: "white",
        label: "Branco",
      },
      {
        id: "gray",
        label: "Cinza",
      },
      {
        id: "blue",
        label: "Azul",
      },
    ],
  },
];

/* =========================================================
   PRODUTOS MOCK
   ========================================================= */

const products: StoreProduct[] = [
  {
    id: "1",
    name: "Tênis Casual Urbano",
    image: "",
    price: 199.9,
    oldPrice: 249.9,
    storeName: "Urban Store",
    category: "Calçados",
    available: true,
    discount: 20,
    createdAt: "2026-09-10",
    filterValues: {
      size: ["38", "39", "40", "41"],
      color: ["black", "white"],
    },
  },
  {
    id: "2",
    name: "Camiseta Oversized",
    image: "",
    price: 89.9,
    storeName: "Urban Store",
    category: "Roupas",
    available: true,
    createdAt: "2026-09-09",
    filterValues: {
      size: ["s", "m", "l", "xl"],
      color: ["black", "white", "gray"],
    },
  },
  {
    id: "3",
    name: "Mochila Minimalista",
    image: "",
    price: 149.9,
    oldPrice: 179.9,
    storeName: "Urban Store",
    category: "Acessórios",
    available: true,
    discount: 17,
    createdAt: "2026-09-08",
    filterValues: {
      color: ["black", "gray"],
    },
  },
  {
    id: "4",
    name: "Jaqueta Jeans",
    image: "",
    price: 279.9,
    storeName: "Urban Store",
    category: "Roupas",
    available: true,
    createdAt: "2026-09-07",
    filterValues: {
      size: ["m", "l", "xl"],
      color: ["blue"],
    },
  },
  {
    id: "5",
    name: "Boné Urban",
    image: "",
    price: 59.9,
    storeName: "Urban Store",
    category: "Acessórios",
    available: true,
    discount: 10,
    createdAt: "2026-09-06",
    filterValues: {
      size: ["m"],
      color: ["black", "white"],
    },
  },
  {
    id: "6",
    name: "Calça Cargo",
    image: "",
    price: 189.9,
    storeName: "Urban Store",
    category: "Roupas",
    available: true,
    createdAt: "2026-09-05",
    filterValues: {
      size: ["s", "m", "l"],
      color: ["black", "gray"],
    },
  },
  {
    id: "7",
    name: "Tênis Street",
    image: "",
    price: 229.9,
    oldPrice: 299.9,
    storeName: "Urban Store",
    category: "Calçados",
    available: true,
    discount: 23,
    createdAt: "2026-09-04",
    filterValues: {
      color: ["black", "blue"],
    },
  },
  {
    id: "8",
    name: "Carteira Minimalista",
    image: "",
    price: 79.9,
    storeName: "Urban Store",
    category: "Acessórios",
    available: false,
    createdAt: "2026-09-03",
    filterValues: {
      color: ["black", "brown"],
    },
  },
  {
    id: "9",
    name: "Moletom Oversized",
    image: "",
    price: 219.9,
    storeName: "Urban Store",
    category: "Roupas",
    available: true,
    createdAt: "2026-09-02",
    filterValues: {
      size: ["m", "l", "xl"],
      color: ["gray", "black"],
    },
  },
  {
    id: "10",
    name: "Óculos Urban",
    image: "",
    price: 119.9,
    oldPrice: 149.9,
    storeName: "Urban Store",
    category: "Acessórios",
    available: true,
    discount: 20,
    createdAt: "2026-09-01",
    filterValues: {
      color: ["black", "white"],
    },
  },
];

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

/* =========================================================
   PÁGINA
   ========================================================= */

export function StorePage() {
  const [search, setSearch] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [sort, setSort] = useState("relevance");
  const [currentPage, setCurrentPage] = useState(1);

  /*
   * Filtros personalizados selecionados.
   *
   * Exemplo:
   *
   * {
   *   size: ["m", "l"],
   *   color: ["black"]
   * }
   */
  const [selectedFilters, setSelectedFilters] =
    useState<Record<string, string[]>>({});

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
  }, [search, selectedFilter, selectedFilters, sort]);

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

  /* =======================================================
     RENDER
     ======================================================= */

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

            {/* Filtros */}
            <StoreFilterSidebar
              filters={storeFilters}
              selectedFilters={selectedFilters}
              onChange={handleStoreFilterChange}
              onClear={clearStoreFilters}
            />

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
                      onView={(selectedProduct: Product) => {
                        console.log(
                          "Visualizar produto:",
                          selectedProduct
                        );
                      }}
                      onAddToCart={(selectedProduct: Product) => {
                        console.log(
                          "Adicionar ao carrinho:",
                          selectedProduct
                        );
                      }}
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