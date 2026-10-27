import { useEffect, useState, type FormEvent } from "react";
import { Plus, Trash2, SlidersHorizontal, Layers3 } from "lucide-react";

import { PageHeader } from "../../components/layout/pageHeader";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";

const STORAGE_KEY = "villacollab_store_catalog_settings";

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

interface CatalogSettings {
  filters: CustomFilter[];
}

const defaultSettings: CatalogSettings = {
  filters: [{ id: "filter-material", name: "Material" }],
};

function createId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function loadSettings(): CatalogSettings {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (saved) {
      const parsed: unknown = JSON.parse(saved);

      if (typeof parsed === "object" && parsed !== null) {
        const data = parsed as Record<string, unknown>;

        if (Array.isArray(data.filters)) {
          const filters: CustomFilter[] = data.filters
            .filter(
              (item): item is Record<string, unknown> =>
                typeof item === "object" && item !== null,
            )
            .filter(
              (item) =>
                typeof item.name === "string" &&
                item.name.trim().length > 0,
            )
            .map((item, index) => ({
              id:
                typeof item.id === "string"
                  ? item.id
                  : `filter-${index}-${item.name}`,
              name: (item.name as string).trim(),
            }));

          return { filters };
        }
      }
    }
  } catch (error) {
    console.error("Não foi possível carregar os filtros salvos.", error);
  }

  return {
    filters: defaultSettings.filters.map((filter) => ({ ...filter })),
  };
}

export function StoreCatalogSettings() {
  const [settings, setSettings] = useState<CatalogSettings>(loadSettings);
  const [filterName, setFilterName] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error(
        "Não foi possível salvar as configurações neste navegador.",
        error,
      );
    }
  }, [settings]);

  function addFilter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const name = filterName.trim();

    if (!name) {
      setMessage("Informe um nome para o filtro.");
      return;
    }

    const alreadyExists = settings.filters.some(
      (filter) => filter.name.toLowerCase() === name.toLowerCase(),
    );

    if (alreadyExists) {
      setMessage("Já existe um filtro com esse nome.");
      return;
    }

    setSettings((current) => ({
      ...current,
      filters: [...current.filters, { id: createId(), name }],
    }));

    setFilterName("");
    setMessage(`Filtro "${name}" criado com sucesso.`);
  }

  function removeFilter(filter: CustomFilter) {
    if (
      !window.confirm(
        `Deseja realmente excluir o filtro "${filter.name}"?`,
      )
    ) {
      return;
    }

    setSettings((current) => ({
      ...current,
      filters: current.filters.filter((item) => item.id !== filter.id),
    }));

    setMessage(`Filtro "${filter.name}" removido.`);
  }

  function resetSettings() {
    if (
      !window.confirm(
        "Deseja restaurar os filtros iniciais? Os filtros personalizados serão removidos.",
      )
    ) {
      return;
    }

    setSettings({
      filters: defaultSettings.filters.map((filter) => ({ ...filter })),
    });

    setFilterName("");
    setMessage("Filtros restaurados para a configuração inicial.");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Catálogo e filtros"
        description="Consulte as categorias gerais e personalize os filtros exibidos na sua loja."
      />

      {message && (
        <div
          role="status"
          className="rounded-md border border-border bg-white px-4 py-3 text-sm text-text"
        >
          {message}
        </div>
      )}

      {/* Categorias gerais */}
      <Card className="p-5 sm:p-6">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-background-secondary">
            <Layers3 size={20} className="text-text" />
          </div>

          <div>
            <h2 className="font-semibold text-text">
              Categorias gerais
            </h2>

            <p className="mt-1 text-sm text-text-secondary">
              Categorias compartilhadas por todo o marketplace.
            </p>
          </div>
        </div>

        <div className="mb-4 rounded-md border border-border bg-background-secondary p-3 text-sm text-text-secondary">
          As categorias são definidas pela plataforma. Para incluir ou
          alterar uma categoria geral, é necessário solicitar ao administrador.
        </div>

        <div className="flex flex-wrap gap-2">
          {generalCategories.map((category) => (
            <span
              key={category}
              className="rounded-full border border-border bg-white px-3 py-1.5 text-sm text-text"
            >
              {category}
            </span>
          ))}
        </div>
      </Card>

      {/* Filtros personalizados */}
      <Card className="p-5 sm:p-6">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-background-secondary">
            <SlidersHorizontal size={20} className="text-text" />
          </div>

          <div>
            <h2 className="font-semibold text-text">
              Filtros personalizados
            </h2>

            <p className="mt-1 text-sm text-text-secondary">
              Defina características para ajudar os clientes a encontrar
              produtos na sua loja.
            </p>
          </div>
        </div>

        <form
          onSubmit={addFilter}
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
        >
          <div className="min-w-0 flex-1">
            <label
              htmlFor="filterName"
              className="mb-2 block text-sm font-medium text-text"
            >
              Nome do filtro
            </label>

            <Input
              id="filterName"
              value={filterName}
              onChange={(event) => setFilterName(event.target.value)}
              placeholder="Ex.: Material, Cor, Tamanho..."
              maxLength={50}
              required
            />
          </div>

          <Button type="submit">
            <Plus size={16} className="mr-2" />
            Adicionar filtro
          </Button>
        </form>


        <div className="mt-6 border-t border-border pt-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-text">
              Filtros cadastrados
            </h3>

            <span className="rounded-full bg-background-secondary px-2.5 py-1 text-xs font-medium text-text-secondary">
              {settings.filters.length}
            </span>
          </div>

          {settings.filters.length === 0 ? (
            <div className="rounded-md border border-dashed border-border bg-background-secondary p-5 text-center">
              <SlidersHorizontal
                size={22}
                className="mx-auto mb-2 text-text-secondary"
              />

              <p className="text-sm font-medium text-text">
                Nenhum filtro cadastrado
              </p>

              <p className="mt-1 text-sm text-text-secondary">
                Adicione seu primeiro filtro para personalizar o catálogo.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {settings.filters.map((filter) => (
                <li
                  key={filter.id}
                  className="flex items-center justify-between gap-3 py-3"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <input
                      type="checkbox"
                      disabled
                      aria-label={`Prévia do filtro ${filter.name}`}
                      className="h-4 w-4 shrink-0 accent-zinc-800"
                    />

                    <span className="min-w-0 break-words text-sm font-medium text-text">
                      {filter.name}
                    </span>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => removeFilter(filter)}
                    aria-label={`Remover filtro ${filter.name}`}
                  >
                    <Trash2 size={16} className="mr-2" />
                    Remover
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>

      {/* Ações */}
      <div className="flex justify-end border-t border-border pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={resetSettings}
        >
          Restaurar filtros padrão
        </Button>
      </div>
    </div>
  );
}