
import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ImagePlus,
  Save,
  X,
  SlidersHorizontal,
} from "lucide-react";

import { PageHeader } from "../../components/layout/pageHeader";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { FormField } from "../../components/ui/formField";

const CATALOG_STORAGE_KEY = "villacollab_store_catalog_settings";

const generalCategories = [
  "Roupas",
  "Calçados",
  "Acessórios",
  "Periféricos",
  "Informática",
  "Áudio",
  "Casa e decoração",
  "Beleza e cuidados pessoais",
  "Esportes",
  "Brinquedos",
  "Livros",
  "Alimentos e bebidas",
];

interface CustomFilter {
  id: string;
  name: string;
}

interface ProductFormData {
  name: string;
  description: string;
  category: string;
  price: string;
  stock: string;
  status: "Ativo" | "Inativo";
  filters: string[];
}

interface CatalogSettings {
  filters: CustomFilter[];
}

const mockProducts: Record<string, ProductFormData> = {
  "1": {
    name: "Camiseta básica",
    description: "Camiseta básica de algodão.",
    category: "Roupas",
    price: "59.90",
    stock: "25",
    status: "Ativo",
    filters: ["filter-material"],
  },
  "2": {
    name: "Caneca personalizada",
    description: "Caneca de cerâmica personalizada.",
    category: "Casa e decoração",
    price: "34.90",
    stock: "12",
    status: "Ativo",
    filters: [],
  },
  "3": {
    name: "Bolsa artesanal",
    description: "Bolsa artesanal feita à mão.",
    category: "Acessórios",
    price: "89.90",
    stock: "0",
    status: "Inativo",
    filters: [],
  },
};

const emptyForm: ProductFormData = {
  name: "",
  description: "",
  category: "",
  price: "",
  stock: "",
  status: "Ativo",
  filters: [],
};

function loadCatalogFilters(): CustomFilter[] {
  try {
    const saved = localStorage.getItem(CATALOG_STORAGE_KEY);

    if (!saved) return [];

    const settings = JSON.parse(saved) as Partial<CatalogSettings>;

    if (!Array.isArray(settings.filters)) return [];

    return settings.filters.filter(
      (filter): filter is CustomFilter =>
        typeof filter?.id === "string" &&
        typeof filter?.name === "string" &&
        filter.name.trim().length > 0,
    );
  } catch {
    return [];
  }
}

export function ProductFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const isEditing = Boolean(id);
  const existingProduct = id ? mockProducts[id] : undefined;

  const [form, setForm] = useState<ProductFormData>(() =>
    existingProduct
      ? { ...existingProduct, filters: [...existingProduct.filters] }
      : { ...emptyForm, filters: [] },
  );

  const [availableFilters, setAvailableFilters] = useState<CustomFilter[]>(
    () => loadCatalogFilters(),
  );

  const [error, setError] = useState("");

  useEffect(() => {
    function refreshFilters() {
      setAvailableFilters(loadCatalogFilters());
    }

    // Atualiza se as configurações forem alteradas em outra aba.
    window.addEventListener("storage", refreshFilters);

    return () => {
      window.removeEventListener("storage", refreshFilters);
    };
  }, []);

  function handleChange(
    field: Exclude<keyof ProductFormData, "filters">,
    value: string,
  ) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));

    setError("");
  }

  function handleFilterToggle(filterId: string) {
    setForm((previous) => ({
      ...previous,
      filters: previous.filters.includes(filterId)
        ? previous.filters.filter((id) => id !== filterId)
        : [...previous.filters, filterId],
    }));

    setError("");
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isEditing && !existingProduct) {
      setError("Produto não encontrado.");
      return;
    }

    const product = {
      ...form,
      price: Number(form.price),
      stock: Number(form.stock),
    };

    if (isEditing) {
      console.log("Produto atualizado:", { id, ...product });
    } else {
      console.log("Novo produto:", product);
    }

    // Demonstração: ainda não persiste os dados no backend.
    navigate("/store/produtos");
  }

  if (isEditing && !existingProduct) {
    return (
      <div className="space-y-5">
        <PageHeader
          title="Produto não encontrado"
          description="Não foi possível localizar o produto solicitado nos dados simulados."
        />

        <Button
          type="button"
          variant="outline"
          onClick={() => navigate("/store/produtos")}
        >
          <ArrowLeft size={16} className="mr-2" />
          Voltar para produtos
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={isEditing ? "Editar produto" : "Novo produto"}
        description={
          isEditing
            ? "Atualize as informações do produto da sua loja."
            : "Cadastre um novo produto no catálogo da sua loja."
        }
        action={
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/store/produtos")}
          >
            <ArrowLeft size={16} className="mr-2" />
            Voltar
          </Button>
        }
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="p-5 sm:p-6">
          <h2 className="mb-5 text-lg font-semibold text-text">
            Informações do produto
          </h2>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <FormField label="Nome do produto">
                <Input
                  value={form.name}
                  onChange={(event) =>
                    handleChange("name", event.target.value)
                  }
                  placeholder="Ex.: Camiseta básica"
                  required
                />
              </FormField>
            </div>

            <div className="sm:col-span-2">
              <FormField label="Descrição">
                <textarea
                  value={form.description}
                  onChange={(event) =>
                    handleChange("description", event.target.value)
                  }
                  placeholder="Descreva as características do produto..."
                  rows={4}
                  required
                  className="w-full resize-y rounded-md border border-border bg-white px-3 py-2 text-sm text-text outline-none placeholder:text-muted focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </FormField>
            </div>

            <FormField label="Categoria">
              <select
                value={form.category}
                onChange={(event) =>
                  handleChange("category", event.target.value)
                }
                required
                className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm text-text outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              >
                <option value="" disabled>
                  Selecione uma categoria
                </option>

                {generalCategories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </FormField>
          </div>
        </Card>

        <Card className="p-5 sm:p-6">
          <div className="mb-5 flex items-start gap-3">
            <div className="rounded-lg bg-background-secondary p-2">
              <SlidersHorizontal
                size={20}
                className="text-text-secondary"
              />
            </div>

            <div>
              <h2 className="text-lg font-semibold text-text">
                Filtros do produto
              </h2>
              <p className="mt-1 text-sm text-text-secondary">
                Selecione os filtros que se aplicam a este produto.
              </p>
            </div>
          </div>

          {availableFilters.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {availableFilters.map((filter) => {
                const selected = form.filters.includes(filter.id);

                return (
                  <label
                    key={filter.id}
                    className={`flex cursor-pointer items-center gap-3 rounded-lg border p-4 transition-colors ${
                      selected
                        ? "border-primary bg-background-secondary"
                        : "border-border bg-white hover:bg-background-secondary"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => handleFilterToggle(filter.id)}
                      className="h-4 w-4 accent-primary"
                    />

                    <span className="text-sm font-medium text-text">
                      {filter.name}
                    </span>
                  </label>
                );
              })}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border bg-background-secondary p-6 text-center">
              <SlidersHorizontal
                size={24}
                className="mx-auto mb-2 text-text-secondary"
              />

              <p className="text-sm font-medium text-text">
                Nenhum filtro cadastrado
              </p>

              <p className="mt-1 text-sm text-text-secondary">
                Acesse Catálogo e filtros para criar filtros antes de
                associá-los aos seus produtos.
              </p>
            </div>
          )}
        </Card>

        <Card className="p-5 sm:p-6">
          <h2 className="mb-5 text-lg font-semibold text-text">
            Preço e estoque
          </h2>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <FormField label="Preço (R$)">
              <Input
                type="number"
                min="0.01"
                step="0.01"
                value={form.price}
                onChange={(event) =>
                  handleChange("price", event.target.value)
                }
                placeholder="0,00"
                required
              />
            </FormField>

            <FormField label="Quantidade em estoque">
              <Input
                type="number"
                min="0"
                step="1"
                value={form.stock}
                onChange={(event) =>
                  handleChange("stock", event.target.value)
                }
                placeholder="0"
                required
              />
            </FormField>

            <div className="sm:col-span-2">
              <FormField label="Status do produto">
                <select
                  value={form.status}
                  onChange={(event) =>
                    handleChange(
                      "status",
                      event.target.value as ProductFormData["status"],
                    )
                  }
                  className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm text-text outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                >
                  <option value="Ativo">Ativo</option>
                  <option value="Inativo">Inativo</option>
                </select>
              </FormField>
            </div>
          </div>
        </Card>

        <Card className="p-5 sm:p-6">
          <h2 className="mb-2 text-lg font-semibold text-text">
            Imagem do produto
          </h2>

          <p className="mb-5 text-sm text-text-secondary">
            Adicione uma imagem para apresentar o produto aos clientes.
          </p>

          <div className="flex min-h-40 flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-background-secondary p-6 text-center">
            <ImagePlus size={32} className="mb-3 text-text-secondary" />

            <p className="text-sm font-medium text-text">
              Upload de imagem
            </p>
          </div>
        </Card>

        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/store/produtos")}
          >
            <X size={16} className="mr-2" />
            Cancelar
          </Button>

          <Button type="submit">
            <Save size={16} className="mr-2" />
            {isEditing ? "Salvar alterações" : "Cadastrar produto"}
          </Button>
        </div>
      </form>
    </div>
  );
}
