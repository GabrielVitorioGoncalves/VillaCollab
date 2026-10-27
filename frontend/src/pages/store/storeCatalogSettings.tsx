import { useState, type FormEvent } from "react";
import { Plus, Trash2, SlidersHorizontal, Layers3, X } from "lucide-react";

import { PageHeader } from "../../components/layout/pageHeader";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { useStore } from "../../components/layout/storeContext";
import { errorMessage } from "../../lib/api";
import { generalCategories, uniqueSlug } from "../../lib/categories";
import { updateStore } from "../../lib/services";
import type { FiltroLoja } from "../../types/api";

const MAX_FILTERS = 10;
const MAX_OPTIONS = 50;

function splitOptions(value: string) {
  const seen = new Set<string>();
  return value
    .split(",")
    .map((option) => option.trim())
    .filter((option) => {
      const key = option.toLowerCase();
      if (!option || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function withOptions(names: string[], existing: FiltroLoja["opcoes"] = []) {
  const taken = existing.map((option) => option.id);
  const created = names.map((nome) => {
    const id = uniqueSlug(nome, taken, `opcao-${taken.length + 1}`);
    taken.push(id);
    return { id, nome: nome.slice(0, 60) };
  });
  return [...existing, ...created];
}

export function StoreCatalogSettings() {
  const { loja, setLoja } = useStore();
  const filters = loja.filtros ?? [];
  const [filterName, setFilterName] = useState("");
  const [filterOptions, setFilterOptions] = useState("");
  const [filterType, setFilterType] = useState<FiltroLoja["tipo"]>("checkbox");
  const [newOption, setNewOption] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function save(next: FiltroLoja[], success: string) {
    setSaving(true);
    try {
      const updated = await updateStore(loja.id, { filtros: next });
      setLoja(updated);
      setMessage(success);
      return true;
    } catch (caught) {
      setMessage(`Não foi possível salvar: ${errorMessage(caught)}`);
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function addFilter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;

    const name = filterName.trim();
    const options = splitOptions(filterOptions);

    if (!name) {
      setMessage("Informe um nome para o filtro.");
      return;
    }

    const alreadyExists = filters.some(
      (filter) => filter.nome.toLowerCase() === name.toLowerCase(),
    );

    if (alreadyExists) {
      setMessage("Já existe um filtro com esse nome.");
      return;
    }

    if (options.length === 0) {
      setMessage("Informe pelo menos uma opção para o filtro, separadas por vírgula.");
      return;
    }

    if (filters.length >= MAX_FILTERS) {
      setMessage(`A loja pode ter no máximo ${MAX_FILTERS} filtros.`);
      return;
    }

    const filter: FiltroLoja = {
      id: uniqueSlug(name, filters.map((item) => item.id), `filtro-${filters.length + 1}`),
      nome: name.slice(0, 60),
      tipo: filterType,
      opcoes: withOptions(options.slice(0, MAX_OPTIONS)),
    };

    if (await save([...filters, filter], `Filtro "${name}" criado com sucesso.`)) {
      setFilterName("");
      setFilterOptions("");
    }
  }

  async function addOption(filter: FiltroLoja) {
    const names = splitOptions(newOption[filter.id] ?? "").filter(
      (name) => !filter.opcoes.some((option) => option.nome.toLowerCase() === name.toLowerCase()),
    );
    if (names.length === 0) return;
    if (filter.opcoes.length + names.length > MAX_OPTIONS) {
      setMessage(`Cada filtro pode ter no máximo ${MAX_OPTIONS} opções.`);
      return;
    }
    const next = filters.map((item) =>
      item.id === filter.id ? { ...item, opcoes: withOptions(names, item.opcoes) } : item,
    );
    if (await save(next, `Opções adicionadas em "${filter.nome}".`)) {
      setNewOption((current) => ({ ...current, [filter.id]: "" }));
    }
  }

  async function removeOption(filter: FiltroLoja, optionId: string) {
    if (filter.opcoes.length <= 1) {
      setMessage("Um filtro precisa de pelo menos uma opção. Para tirar a última, remova o filtro.");
      return;
    }
    const next = filters.map((item) =>
      item.id === filter.id ? { ...item, opcoes: item.opcoes.filter((option) => option.id !== optionId) } : item,
    );
    await save(next, `Opção removida de "${filter.nome}".`);
  }

  async function removeFilter(filter: FiltroLoja) {
    if (
      !window.confirm(
        `Deseja realmente excluir o filtro "${filter.nome}"?`,
      )
    ) {
      return;
    }

    await save(
      filters.filter((item) => item.id !== filter.id),
      `Filtro "${filter.nome}" removido.`,
    );
  }

  async function resetSettings() {
    if (
      !window.confirm(
        "Deseja restaurar os filtros iniciais? Os filtros personalizados serão removidos.",
      )
    ) {
      return;
    }

    if (await save([], "Filtros restaurados para a configuração inicial (sem filtros personalizados).")) {
      setFilterName("");
      setFilterOptions("");
    }
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
          className="flex flex-col gap-3 lg:flex-row lg:items-end"
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

          <div className="min-w-0 flex-1">
            <label
              htmlFor="filterOptions"
              className="mb-2 block text-sm font-medium text-text"
            >
              Opções (separadas por vírgula)
            </label>

            <Input
              id="filterOptions"
              value={filterOptions}
              onChange={(event) => setFilterOptions(event.target.value)}
              placeholder="Ex.: Algodão, Linho, Poliéster"
            />
          </div>

          <div>
            <label
              htmlFor="filterType"
              className="mb-2 block text-sm font-medium text-text"
            >
              Seleção
            </label>

            <select
              id="filterType"
              value={filterType}
              onChange={(event) => setFilterType(event.target.value as FiltroLoja["tipo"])}
              className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm text-text outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            >
              <option value="checkbox">Várias opções</option>
              <option value="radio">Uma opção</option>
            </select>
          </div>

          <Button type="submit" disabled={saving}>
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
              {filters.length}
            </span>
          </div>

          {filters.length === 0 ? (
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
              {filters.map((filter) => (
                <li
                  key={filter.id}
                  className="py-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <input
                        type={filter.tipo === "radio" ? "radio" : "checkbox"}
                        disabled
                        aria-label={`Prévia do filtro ${filter.nome}`}
                        className="h-4 w-4 shrink-0 accent-zinc-800"
                      />

                      <span className="min-w-0 break-words text-sm font-medium text-text">
                        {filter.nome}
                      </span>

                      <span className="text-xs text-text-secondary">
                        {filter.tipo === "radio" ? "uma opção" : "várias opções"}
                      </span>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      disabled={saving}
                      onClick={() => removeFilter(filter)}
                      aria-label={`Remover filtro ${filter.nome}`}
                    >
                      <Trash2 size={16} className="mr-2" />
                      Remover
                    </Button>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2 pl-7">
                    {filter.opcoes.map((option) => (
                      <span
                        key={option.id}
                        className="inline-flex items-center gap-1 rounded-full border border-border bg-white px-3 py-1 text-xs text-text"
                      >
                        {option.nome}
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => removeOption(filter, option.id)}
                          aria-label={`Remover opção ${option.nome}`}
                          className="text-text-secondary hover:text-text"
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))}

                    <form
                      className="flex items-center gap-1"
                      onSubmit={(event) => {
                        event.preventDefault();
                        void addOption(filter);
                      }}
                    >
                      <Input
                        value={newOption[filter.id] ?? ""}
                        onChange={(event) =>
                          setNewOption((current) => ({ ...current, [filter.id]: event.target.value }))
                        }
                        placeholder="Nova opção"
                        aria-label={`Nova opção para ${filter.nome}`}
                        className="h-8 w-36 text-xs"
                      />
                      <Button type="submit" variant="ghost" disabled={saving} aria-label={`Adicionar opção em ${filter.nome}`}>
                        <Plus size={14} />
                      </Button>
                    </form>
                  </div>
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
          disabled={saving || filters.length === 0}
          onClick={resetSettings}
        >
          Restaurar filtros padrão
        </Button>
      </div>
    </div>
  );
}