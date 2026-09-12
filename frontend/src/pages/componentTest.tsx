import { useState } from "react";

import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { FormField } from "../components/ui/formField";
import { Input } from "../components/ui/input";

import { Navbar } from "../components/layout/navBar";
import { PageContainer } from "../components/layout/pageContainer";
import { PageHeader } from "../components/layout/pageHeader";
import { Sidebar } from "../components/layout/sideBar";

import {
  ProductCard,
  type Product,
} from "../components/marketplace/productCard";

import { ProductGrid } from "../components/marketplace/productGrid";

import {
  StoreCard,
  type Store,
} from "../components/marketplace/storeCard";

import { StoreGrid } from "../components/marketplace/storeGrid";

import { Price } from "../components/marketplace/price";

import { SearchBar } from "../components/search/searchBar";

import { CategoryChip } from "../components/search/categoryChip";

import { CategoryList } from "../components/search/categoryList";

export function ComponentTest() {
  const [inputValue, setInputValue] = useState("");

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // =========================================================
  // NOVOS ESTADOS - SEARCH / CATEGORIA
  // =========================================================

  const [search, setSearch] = useState("");

  const [selectedCategory, setSelectedCategory] =
    useState("all");

  // =========================================================
  // MOCK - CATEGORIAS
  // =========================================================

  const categories = [
    {
      id: "all",
      name: "Todos",
    },
    {
      id: "clothes",
      name: "Roupas",
    },
    {
      id: "shoes",
      name: "Calçados",
    },
    {
      id: "electronics",
      name: "Eletrônicos",
    },
    {
      id: "accessories",
      name: "Acessórios",
    },
  ];

  // =========================================================
  // MOCK - LOJAS
  // =========================================================

  const stores: Store[] = [
    {
      id: "1",
      name: "Urban Store",
      category: "Moda",
      description: "Moda urbana e acessórios.",
      productCount: 124,
    },
    {
      id: "2",
      name: "Tech House",
      category: "Eletrônicos",
      description:
        "Tecnologia e acessórios para o dia a dia.",
      productCount: 87,
    },
    {
      id: "3",
      name: "Street Wear",
      category: "Moda",
      description:
        "Roupas e acessórios urbanos.",
      productCount: 63,
    },
  ];

  // =========================================================
  // MOCK - PRODUTOS
  // =========================================================

  const products: Product[] = [
    {
      id: "1",
      name: "Tênis Casual Urbano",
      price: 199.9,
      oldPrice: 249.9,
      storeName: "Urban Store",
      category: "Calçados",
      available: true,
      discount: 20,
    },
    {
      id: "2",
      name: "Camiseta Oversized",
      price: 89.9,
      storeName: "Street Wear",
      category: "Roupas",
      available: true,
    },
    {
      id: "3",
      name: "Mochila Minimalista",
      price: 149.9,
      oldPrice: 179.9,
      storeName: "Urban Store",
      category: "Acessórios",
      available: true,
      discount: 17,
    },
    {
      id: "4",
      name: "Relógio Digital",
      price: 299.9,
      storeName: "Tech House",
      category: "Eletrônicos",
      available: false,
    },
    {
      id: "5",
      name: "Fone Bluetooth",
      price: 129.9,
      storeName: "Tech House",
      category: "Eletrônicos",
      available: true,
    },
  ];

  return (
    <div className="min-h-screen bg-background text-text">

      {/* =====================================================
          NAVBAR
      ====================================================== */}

      <Navbar />

      {/* =====================================================
          CONTEÚDO
      ====================================================== */}

      <div className="flex">

        {/* ===================================================
            SIDEBAR
        ==================================================== */}

        <Sidebar
          collapsed={sidebarCollapsed}
          onCollapseChange={setSidebarCollapsed}
        />

        {/* ===================================================
            MAIN
        ==================================================== */}

        <main className="min-w-0 flex-1">

          <PageContainer className="py-8">

            {/* =================================================
                PAGE HEADER
            ================================================== */}

            <PageHeader
              title="Componentes VillaCollab"
              description="Página de testes dos componentes visuais do sistema."
              action={
                <Button>
                  Ação principal
                </Button>
              }
            />

            <div className="space-y-8">

              {/* =================================================
                  BUTTON
              ================================================== */}

              <section>
                <h2 className="mb-4 text-lg font-semibold">
                  Button
                </h2>

                <Card className="p-6">

                  <div className="flex flex-wrap gap-3">

                    <Button>
                      Primary
                    </Button>

                    <Button variant="secondary">
                      Secondary
                    </Button>

                    <Button variant="outline">
                      Outline
                    </Button>

                    <Button variant="danger">
                      Danger
                    </Button>

                    <Button variant="ghost">
                      Ghost
                    </Button>

                    <Button disabled>
                      Disabled
                    </Button>

                  </div>

                </Card>
              </section>


              {/* =================================================
                  INPUT
              ================================================== */}

              <section>
                <h2 className="mb-4 text-lg font-semibold">
                  Input
                </h2>

                <Card className="max-w-xl p-6">

                  <div className="space-y-4">

                    <Input
                      placeholder="Digite alguma coisa..."
                    />

                    <Input
                      type="email"
                      placeholder="seu@email.com"
                    />

                    <Input
                      type="password"
                      placeholder="Sua senha"
                    />

                    <Input
                      error
                      value="valor inválido"
                      readOnly
                    />

                    <Input
                      disabled
                      placeholder="Campo desabilitado"
                    />

                  </div>

                </Card>
              </section>


              {/* =================================================
                  FORM FIELD
              ================================================== */}

              <section>
                <h2 className="mb-4 text-lg font-semibold">
                  FormField
                </h2>

                <Card className="max-w-xl p-6">

                  <div className="space-y-5">

                    <FormField
                      label="Nome completo"
                      required
                    >
                      <Input
                        placeholder="Ex: João da Silva"
                      />
                    </FormField>

                    <FormField
                      label="Email"
                      required
                      helperText="Utilize um email válido."
                    >
                      <Input
                        type="email"
                        placeholder="seu@email.com"
                      />
                    </FormField>

                    <FormField
                      label="Senha"
                      required
                      helperText="Mínimo de 8 caracteres."
                    >
                      <Input
                        type="password"
                        placeholder="Digite sua senha"
                      />
                    </FormField>

                    <FormField
                      label="Email"
                      required
                      error="Digite um email válido."
                    >
                      <Input
                        type="email"
                        error
                        value="email-invalido"
                        readOnly
                      />
                    </FormField>

                  </div>

                </Card>
              </section>


              {/* =================================================
                  CARD
              ================================================== */}

              <section>
                <h2 className="mb-4 text-lg font-semibold">
                  Card
                </h2>

                <div className="grid gap-4 md:grid-cols-3">

                  <Card className="p-6">
                    <p className="text-sm text-text-secondary">
                      Faturamento
                    </p>

                    <p className="mt-2 text-2xl font-bold">
                      R$ 12.450,00
                    </p>
                  </Card>

                  <Card className="p-6">
                    <p className="text-sm text-text-secondary">
                      Pedidos
                    </p>

                    <p className="mt-2 text-2xl font-bold">
                      248
                    </p>
                  </Card>

                  <Card className="p-6">
                    <p className="text-sm text-text-secondary">
                      Lojas
                    </p>

                    <p className="mt-2 text-2xl font-bold">
                      32
                    </p>
                  </Card>

                </div>
              </section>


              {/* =================================================
                  BADGE
              ================================================== */}

              <section>
                <h2 className="mb-4 text-lg font-semibold">
                  Badge
                </h2>

                <Card className="p-6">

                  <div className="flex flex-wrap gap-3">

                    <Badge>
                      Rascunho
                    </Badge>

                    <Badge variant="success">
                      Ativo
                    </Badge>

                    <Badge variant="warning">
                      Pendente
                    </Badge>

                    <Badge variant="danger">
                      Cancelado
                    </Badge>

                  </div>

                </Card>
              </section>


              {/* =================================================
                  INTERAÇÃO
              ================================================== */}

              <section>
                <h2 className="mb-4 text-lg font-semibold">
                  Interação
                </h2>

                <Card className="max-w-xl p-6">

                  <FormField
                    label="Campo controlado"
                    helperText={`Valor atual: ${
                      inputValue || "(vazio)"
                    }`}
                  >
                    <Input
                      value={inputValue}
                      onChange={(event) =>
                        setInputValue(event.target.value)
                      }
                      placeholder="Digite para testar"
                    />
                  </FormField>

                  <div className="mt-5 flex gap-3">

                    <Button
                      onClick={() => setInputValue("")}
                      variant="outline"
                    >
                      Limpar
                    </Button>

                    <Button
                      onClick={() =>
                        alert(`Valor: ${inputValue}`)
                      }
                    >
                      Testar
                    </Button>

                  </div>

                </Card>
              </section>


              {/* =================================================
                  PRICE
              ================================================== */}

              <section>
                <h2 className="mb-4 text-lg font-semibold">
                  Price
                </h2>

                <Card className="p-6">

                  <div className="flex flex-wrap items-center gap-8">

                    <Price
                      value={89.9}
                      size="sm"
                    />

                    <Price
                      value={199.9}
                      oldValue={249.9}
                    />

                    <Price
                      value={1299.9}
                      oldValue={1599.9}
                      installment="em até 10x sem juros"
                      size="lg"
                    />

                  </div>

                </Card>
              </section>


              {/* =================================================
                  PRODUCT CARD
              ================================================== */}

              <section>
                <h2 className="mb-4 text-lg font-semibold">
                  ProductCard
                </h2>

                <div className="max-w-sm">

                  <ProductCard
                    product={products[0]}
                    onView={(product) => {
                      console.log(
                        "Visualizar produto:",
                        product
                      );
                    }}
                    onAddToCart={(product) => {
                      console.log(
                        "Adicionar ao carrinho:",
                        product
                      );
                    }}
                  />

                </div>
              </section>


              {/* =================================================
                  PRODUCT GRID
              ================================================== */}

              <section>
                <h2 className="mb-4 text-lg font-semibold">
                  ProductGrid
                </h2>

                <ProductGrid
                  products={products}
                  onViewProduct={(product) => {
                    console.log(
                      "Produto selecionado:",
                      product
                    );
                  }}
                  onAddToCart={(product) => {
                    console.log(
                      "Adicionar ao carrinho:",
                      product
                    );
                  }}
                />
              </section>


              {/* =================================================
                  STORE CARD
              ================================================== */}

              <section>
                <h2 className="mb-4 text-lg font-semibold">
                  StoreCard
                </h2>

                <div className="max-w-sm">

                  <StoreCard
                    store={stores[0]}
                    onView={(store) => {
                      console.log(
                        "Visualizar loja:",
                        store
                      );
                    }}
                  />

                </div>
              </section>


              {/* =================================================
                  STORE GRID
              ================================================== */}

              <section>
                <h2 className="mb-4 text-lg font-semibold">
                  StoreGrid
                </h2>

                <StoreGrid
                  stores={stores}
                  onViewStore={(store) => {
                    console.log(
                      "Abrir loja:",
                      store
                    );
                  }}
                />
              </section>


              {/* =================================================
                  SEARCH BAR
              ================================================== */}

              <section>
                <h2 className="mb-4 text-lg font-semibold">
                  SearchBar
                </h2>

                <Card className="max-w-2xl p-6">

                  <SearchBar
                    value={search}
                    onChange={setSearch}
                    onSearch={() => {
                      console.log(
                        "Pesquisar:",
                        search
                      );
                    }}
                  />

                  {search && (
                    <p className="mt-3 text-sm text-text-secondary">
                      Buscando por:{" "}
                      <span className="font-medium text-text">
                        {search}
                      </span>
                    </p>
                  )}

                </Card>
              </section>


              {/* =================================================
                  CATEGORY CHIP
              ================================================== */}

              <section>
                <h2 className="mb-4 text-lg font-semibold">
                  CategoryChip
                </h2>

                <Card className="p-6">

                  <div className="flex flex-wrap gap-2">

                    <CategoryChip
                      label="Todos"
                      active
                      onClick={() =>
                        console.log(
                          "Categoria: Todos"
                        )
                      }
                    />

                    <CategoryChip
                      label="Roupas"
                      onClick={() =>
                        console.log(
                          "Categoria: Roupas"
                        )
                      }
                    />

                    <CategoryChip
                      label="Calçados"
                      onClick={() =>
                        console.log(
                          "Categoria: Calçados"
                        )
                      }
                    />

                    <CategoryChip
                      label="Eletrônicos"
                      onClick={() =>
                        console.log(
                          "Categoria: Eletrônicos"
                        )
                      }
                    />

                  </div>

                </Card>
              </section>


              {/* =================================================
                  CATEGORY LIST
              ================================================== */}

              <section>
                <h2 className="mb-4 text-lg font-semibold">
                  CategoryList
                </h2>

                <Card className="p-6">

                  <CategoryList
                    categories={categories}
                    selectedCategory={selectedCategory}
                    onSelect={(categoryId) => {
                      setSelectedCategory(categoryId);

                      console.log(
                        "Categoria selecionada:",
                        categoryId
                      );
                    }}
                  />

                  <p className="mt-4 text-sm text-text-secondary">
                    Categoria atual:{" "}
                    <span className="font-medium text-text">
                      {
                        categories.find(
                          (category) =>
                            category.id ===
                            selectedCategory
                        )?.name
                      }
                    </span>
                  </p>

                </Card>
              </section>


              {/* =================================================
                  COMBINAÇÃO DOS COMPONENTES
              ================================================== */}

              <section>
                <h2 className="mb-4 text-lg font-semibold">
                  Exemplo de produto
                </h2>

                <Card className="max-w-md overflow-hidden">

                  <div className="aspect-video bg-gray-100" />

                  <div className="space-y-4 p-5">

                    <div className="flex items-start justify-between gap-4">

                      <div>

                        <h3 className="font-semibold">
                          Produto de exemplo
                        </h3>

                        <p className="mt-1 text-sm text-text-secondary">
                          Uma descrição curta do produto.
                        </p>

                      </div>

                      <Badge variant="success">
                        Disponível
                      </Badge>

                    </div>

                    <div>

                      <p className="text-sm text-text-secondary">
                        Preço
                      </p>

                      <p className="text-2xl font-bold">
                        R$ 89,90
                      </p>

                    </div>

                    <div className="flex gap-3">

                      <Button className="flex-1">
                        Comprar
                      </Button>

                      <Button variant="outline">
                        Ver
                      </Button>

                    </div>

                  </div>

                </Card>
              </section>

            </div>

          </PageContainer>

        </main>

      </div>

    </div>
  );
}