
import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Plus, Search, Package } from "lucide-react";

import { PageHeader } from "../../components/layout/pageHeader";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import { RequestStatus } from "../../components/ui/requestStatus";
import { useRequest } from "../../hooks/useRequest";
import { formatCurrency, toNumber } from "../../lib/format";
import { errorMessage } from "../../lib/api";
import { listMyProducts, updateProduct } from "../../lib/services";

type ProductStatus = "Ativo" | "Sem estoque" | "Inativo";

const statusStyle: Record<ProductStatus, string> = {
  Ativo: "bg-green-50 text-green-700",
  "Sem estoque": "bg-yellow-50 text-yellow-700",
  Inativo: "bg-background-secondary text-text-secondary",
};

export function Products() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const location = useLocation();
  const notice = (location.state as { notice?: string } | null)?.notice;
  const request = useRequest("meus-produtos", listMyProducts);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");

  async function toggleActive(id: string, ativo: boolean) {
    if (!request.data || busyId) return;
    setBusyId(id);
    setActionError("");
    try {
      const updated = await updateProduct(id, { ativo });
      request.mutate(request.data.map((produto) => (produto.id === id ? { ...produto, ...updated } : produto)));
    } catch (caught) {
      setActionError(errorMessage(caught));
    } finally {
      setBusyId(null);
    }
  }

  const products = useMemo(
    () =>
      (request.data ?? []).map((produto) => ({
        id: produto.id,
        name: produto.nome,
        category: produto.categoria ?? "—",
        price: toNumber(produto.preco),
        stock: produto.estoque,
        image: produto.imagens?.[0],
        active: produto.ativo !== false,
        status: (produto.ativo === false
          ? "Inativo"
          : produto.estoque <= 0
            ? "Sem estoque"
            : "Ativo") as ProductStatus,
      })),
    [request.data]
  );

  const filteredProducts = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return products.filter((product) => {
      return (
        product.name.toLowerCase().includes(normalizedSearch) ||
        product.category.toLowerCase().includes(normalizedSearch) ||
        product.id.toLowerCase().includes(normalizedSearch)
      );
    });
  }, [products, search]);

  const totalProducts = products.length;

  const activeProducts = products.filter(
    (product) => product.status === "Ativo" && product.stock > 0,
  ).length;

  const outOfStockProducts = products.filter(
    (product) => product.stock <= 0,
  ).length;

  if (!request.data) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Produtos"
          description="Gerencie os produtos cadastrados na sua loja."
        />
        <RequestStatus
          loading={request.loading}
          error={request.error}
          onRetry={request.reload}
          loadingText="Carregando produtos..."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Produtos"
        description="Gerencie os produtos cadastrados na sua loja."
        action={
          <Button onClick={() => navigate("/store/produtos/novo")}>
            <Plus size={18} />
            Novo produto
          </Button>
        }
      />

      {notice && (
        <p role="status" className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {notice}
        </p>
      )}

      {actionError && (
        <p role="alert" className="text-sm text-danger">
          {actionError}
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <p className="text-sm text-text-secondary">
            Total de produtos
          </p>
          <p className="mt-2 text-2xl font-bold text-text">
            {totalProducts}
          </p>
        </Card>

        <Card className="p-5">
          <p className="text-sm text-text-secondary">
            Produtos ativos
          </p>
          <p className="mt-2 text-2xl font-bold text-text">
            {activeProducts}
          </p>
        </Card>

        <Card className="p-5">
          <p className="text-sm text-text-secondary">
            Sem estoque
          </p>
          <p className="mt-2 text-2xl font-bold text-text">
            {outOfStockProducts}
          </p>
        </Card>
      </div>

      <Card className="p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold text-text">
              Todos os produtos
            </h2>
            <p className="mt-1 text-sm text-text-secondary">
              Consulte e gerencie o catálogo da sua loja.
            </p>
          </div>

          <div className="relative w-full sm:max-w-xs">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary"
            />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar produto..."
              className="pl-10"
              aria-label="Buscar produtos"
            />
          </div>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[780px] text-left text-sm">
            <thead className="border-y border-border bg-background">
              <tr>
                <th className="px-4 py-3 font-medium text-text-secondary">
                  Produto
                </th>
                <th className="px-4 py-3 font-medium text-text-secondary">
                  Categoria
                </th>
                <th className="px-4 py-3 font-medium text-text-secondary">
                  Preço
                </th>
                <th className="px-4 py-3 font-medium text-text-secondary">
                  Estoque
                </th>
                <th className="px-4 py-3 font-medium text-text-secondary">
                  Status
                </th>
                <th className="px-4 py-3 font-medium text-text-secondary">
                  Ações
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-border">
              {filteredProducts.map((product) => (
                <tr
                  key={product.id}
                  className="transition-colors hover:bg-background/70"
                >
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-background-secondary">
                        {product.image ? (
                          <img src={product.image} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <Package
                            size={20}
                            className="text-text-secondary"
                          />
                        )}
                      </div>
                      <span className="font-medium text-text">
                        {product.name}
                      </span>
                    </div>
                  </td>

                  <td className="px-4 py-4 text-text-secondary">
                    {product.category}
                  </td>

                  <td className="px-4 py-4 font-medium text-text">
                    {formatCurrency(product.price)}
                  </td>

                  <td className="px-4 py-4 text-text-secondary">
                    {product.stock} unidades
                  </td>

                  <td className="px-4 py-4">
                    <Badge className={statusStyle[product.status]}>
                      {product.status}
                    </Badge>
                  </td>

                  <td className="px-4 py-4">
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() =>
                          navigate(`/store/produtos/${product.id}/editar`)
                        }
                      >
                        Editar
                      </Button>
                      <Button
                        variant="ghost"
                        disabled={busyId === product.id}
                        onClick={() => toggleActive(product.id, !product.active)}
                      >
                        {product.active ? "Desativar" : "Ativar"}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredProducts.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-10 text-center text-sm text-text-secondary"
                  >
                    {totalProducts === 0
                      ? "Nenhum produto cadastrado ainda. Use \"Novo produto\" para começar."
                      : `Nenhum produto encontrado para "${search}".`}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 border-t border-border pt-4 text-sm text-text-secondary">
          Exibindo {filteredProducts.length} de {totalProducts} produtos
        </div>
      </Card>
    </div>
  );
}
