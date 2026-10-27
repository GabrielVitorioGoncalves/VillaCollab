import { useState, type ChangeEvent, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ImagePlus,
  Plus,
  Save,
  Trash2,
  X,
  SlidersHorizontal,
} from "lucide-react";

import { PageHeader } from "../../components/layout/pageHeader";
import { useStore } from "../../components/layout/storeContext";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { FormField } from "../../components/ui/formField";
import { RequestStatus } from "../../components/ui/requestStatus";
import { useRequest } from "../../hooks/useRequest";
import { ApiError, errorMessage } from "../../lib/api";
import { generalCategories, uniqueSlug } from "../../lib/categories";
import { isUuid, toNumber } from "../../lib/format";
import {
  createProduct,
  deleteProduct,
  getMyProduct,
  updateProduct,
  updateStock,
  uploadImage,
  type ProductInput,
} from "../../lib/services";
import type { Produto } from "../../types/api";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];

interface VariantRow {
  name: string;
  options: string;
}

interface AttributeRow {
  name: string;
  value: string;
}

interface ProductFormData {
  name: string;
  description: string;
  category: string;
  price: string;
  oldPrice: string;
  stock: string;
  status: "Ativo" | "Inativo";
  filters: Record<string, string[]>;
  variants: VariantRow[];
  attributes: AttributeRow[];
}

const emptyForm: ProductFormData = {
  name: "",
  description: "",
  category: "",
  price: "",
  oldPrice: "",
  stock: "",
  status: "Ativo",
  filters: {},
  variants: [],
  attributes: [],
};

function toForm(produto: Produto): ProductFormData {
  return {
    name: produto.nome,
    description: produto.descricao ?? "",
    category: produto.categoria ?? "",
    price: String(toNumber(produto.preco)),
    oldPrice: produto.preco_antigo ? String(toNumber(produto.preco_antigo)) : "",
    stock: String(produto.estoque),
    status: produto.ativo === false ? "Inativo" : "Ativo",
    filters: { ...(produto.filtros ?? {}) },
    variants: (produto.variacoes ?? []).map((variacao) => ({
      name: variacao.nome,
      options: variacao.opcoes.map((opcao) => opcao.nome).join(", "),
    })),
    attributes: (produto.atributos ?? []).map((atributo) => ({ name: atributo.nome, value: atributo.valor })),
  };
}

function isMoney(value: string) {
  return /^\d+([.,]\d{1,2})?$/.test(value.trim());
}

function money(value: string) {
  return Number(value.trim().replace(",", "."));
}

export function ProductFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  const request = useRequest(isEditing ? `meu-produto:${id}` : null, () =>
    isUuid(id) ? getMyProduct(id) : Promise.reject(new ApiError("Produto não encontrado.", 404))
  );

  if (isEditing && !request.data) {
    if (request.loading) {
      return (
        <div className="space-y-6">
          <PageHeader title="Editar produto" />
          <RequestStatus loading loadingText="Carregando produto..." />
        </div>
      );
    }

    return (
      <div className="space-y-5">
        <PageHeader
          title="Produto não encontrado"
          description={request.error ?? "Não foi possível localizar o produto solicitado na sua loja."}
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

  return <ProductEditor key={request.data?.id ?? "novo"} product={request.data} />;
}

function ProductEditor({ product }: { product?: Produto }) {
  const navigate = useNavigate();
  const { loja } = useStore();
  const isEditing = Boolean(product);
  const storeFilters = loja.filtros ?? [];

  const [form, setForm] = useState<ProductFormData>(() =>
    product ? toForm(product) : { ...emptyForm, filters: {} },
  );
  const [currentImage, setCurrentImage] = useState<string | undefined>(product?.imagens?.[0]);
  const [newImage, setNewImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteBlocked, setDeleteBlocked] = useState(false);

  function handleChange(
    field: "name" | "description" | "category" | "price" | "oldPrice" | "stock" | "status",
    value: string,
  ) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));

    setError("");
  }

  function handleFilterToggle(filterId: string, optionId: string) {
    setForm((previous) => {
      const current = previous.filters[filterId] ?? [];
      const next = current.includes(optionId)
        ? current.filter((id) => id !== optionId)
        : [...current, optionId];
      return { ...previous, filters: { ...previous.filters, [filterId]: next } };
    });

    setError("");
  }

  function updateRow<K extends "variants" | "attributes">(
    list: K,
    index: number,
    field: keyof ProductFormData[K][number],
    value: string,
  ) {
    setForm((previous) => ({
      ...previous,
      [list]: previous[list].map((row, i) => (i === index ? { ...row, [field]: value } : row)),
    }));
    setError("");
  }

  function handleImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!IMAGE_TYPES.includes(file.type)) {
      setError("Use uma imagem PNG, JPG ou WEBP.");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setError("A imagem pode ter no máximo 5 MB.");
      return;
    }
    if (preview) URL.revokeObjectURL(preview);
    setNewImage(file);
    setPreview(URL.createObjectURL(file));
    setError("");
  }

  function removeImage() {
    if (preview) URL.revokeObjectURL(preview);
    setNewImage(null);
    setPreview(null);
    setCurrentImage(undefined);
  }

  function buildPayload(imagens: string[]): ProductInput & { nome: string; preco: number } {
    const variantIds: string[] = [];
    const variacoes = form.variants
      .map((row) => ({ name: row.name.trim(), options: row.options.split(",").map((o) => o.trim()).filter(Boolean) }))
      .filter((row) => row.name && row.options.length > 0)
      .map((row) => {
        const id = uniqueSlug(row.name, variantIds, `variacao-${variantIds.length + 1}`);
        variantIds.push(id);
        const optionIds: string[] = [];
        return {
          id,
          nome: row.name,
          opcoes: row.options.map((nome) => {
            const optionId = uniqueSlug(nome, optionIds, `opcao-${optionIds.length + 1}`);
            optionIds.push(optionId);
            return { id: optionId, nome };
          }),
        };
      });

    const filtros = Object.fromEntries(
      Object.entries(form.filters).filter(
        ([filterId, options]) => options.length > 0 && storeFilters.some((filter) => filter.id === filterId)
      )
    );

    return {
      nome: form.name.trim(),
      descricao: form.description.trim(),
      categoria: form.category || undefined,
      preco: money(form.price),
      preco_antigo: form.oldPrice.trim() ? money(form.oldPrice) : null,
      ativo: form.status === "Ativo",
      filtros,
      variacoes,
      atributos: form.attributes
        .map((row) => ({ nome: row.name.trim(), valor: row.value.trim() }))
        .filter((row) => row.nome && row.valor),
      imagens,
    };
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;

    if (form.name.trim().length < 3) return setError("O nome precisa ter pelo menos 3 caracteres.");
    if (!isMoney(form.price) || money(form.price) <= 0) return setError("Informe um preço maior que zero, com até 2 casas decimais.");
    if (form.oldPrice.trim() && (!isMoney(form.oldPrice) || money(form.oldPrice) <= money(form.price))) {
      return setError("O preço anterior precisa ser maior que o preço atual (é o \"de\" da promoção).");
    }
    if (!/^\d+$/.test(form.stock.trim())) return setError("O estoque precisa ser um número inteiro (0 ou mais).");
    const stock = Number(form.stock);

    setSaving(true);
    setError("");
    try {
      let imagens = currentImage ? [currentImage, ...(product?.imagens ?? []).slice(1)] : [];
      if (newImage) {
        const { url } = await uploadImage(newImage, "produto");
        imagens = [url, ...(product?.imagens ?? []).slice(1)];
      }
      const payload = buildPayload(imagens);

      if (product) {
        await updateProduct(product.id, payload);
        if (stock !== product.estoque) await updateStock(product.id, stock);
        navigate("/store/produtos", { state: { notice: `"${payload.nome}" foi atualizado.` } });
        return;
      }

      const created = await createProduct(loja.id, payload);
      if (stock > 0) {
        try {
          await updateStock(created.id, stock);
        } catch (caught) {
          navigate("/store/produtos", {
            state: { notice: `"${payload.nome}" foi cadastrado, mas o estoque não foi salvo (${errorMessage(caught)}). Abra o produto para ajustar.` },
          });
          return;
        }
      }
      navigate("/store/produtos", { state: { notice: `"${payload.nome}" foi cadastrado.` } });
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!product) return;
    setSaving(true);
    setError("");
    try {
      await deleteProduct(product.id);
      navigate("/store/produtos", { state: { notice: `"${product.nome}" foi excluído.` } });
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 409) {
        setDeleteBlocked(true);
        setConfirmDelete(false);
      } else {
        setError(errorMessage(caught));
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate() {
    if (!product) return;
    setSaving(true);
    try {
      await updateProduct(product.id, { ativo: false });
      navigate("/store/produtos", { state: { notice: `"${product.nome}" foi desativado e saiu da vitrine.` } });
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setSaving(false);
    }
  }

  const shownImage = preview ?? currentImage;

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

      <form onSubmit={handleSubmit} className="space-y-6" noValidate>
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
                  maxLength={255}
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
                className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm text-text outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              >
                <option value="">
                  Selecione uma categoria
                </option>

                {generalCategories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}

                {form.category && !generalCategories.includes(form.category) && (
                  <option value={form.category}>{form.category}</option>
                )}
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
                Marque as opções em que este produto se encaixa. É assim que ele aparece nos filtros da sua loja.
              </p>
            </div>
          </div>

          {storeFilters.length > 0 ? (
            <div className="space-y-5">
              {storeFilters.map((filter) => (
                <div key={filter.id}>
                  <p className="mb-2 text-sm font-medium text-text">{filter.nome}</p>
                  <div className="flex flex-wrap gap-2">
                    {filter.opcoes.map((option) => {
                      const selected = (form.filters[filter.id] ?? []).includes(option.id);

                      return (
                        <label
                          key={option.id}
                          className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 transition-colors ${
                            selected
                              ? "border-primary bg-background-secondary"
                              : "border-border bg-white hover:bg-background-secondary"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => handleFilterToggle(filter.id, option.id)}
                            className="h-4 w-4 accent-primary"
                          />

                          <span className="text-sm font-medium text-text">
                            {option.nome}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
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
                inputMode="decimal"
                value={form.price}
                onChange={(event) =>
                  handleChange("price", event.target.value)
                }
                placeholder="0,00"
                required
              />
            </FormField>

            <FormField label="Preço anterior (R$)" helperText="Opcional. Preencha para mostrar o produto em promoção.">
              <Input
                inputMode="decimal"
                value={form.oldPrice}
                onChange={(event) =>
                  handleChange("oldPrice", event.target.value)
                }
                placeholder="0,00"
              />
            </FormField>

            <FormField label="Quantidade em estoque">
              <Input
                inputMode="numeric"
                value={form.stock}
                onChange={(event) =>
                  handleChange("stock", event.target.value)
                }
                placeholder="0"
                required
              />
            </FormField>

            <FormField label="Status do produto" helperText="Inativo sai da vitrine, mas continua nos pedidos antigos.">
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
        </Card>

        <Card className="p-5 sm:p-6">
          <h2 className="mb-2 text-lg font-semibold text-text">
            Variações
          </h2>

          <p className="mb-5 text-sm text-text-secondary">
            Opções que o cliente escolhe antes de comprar, como tamanho ou cor. O estoque é o mesmo para todas.
          </p>

          <div className="space-y-3">
            {form.variants.map((variant, index) => (
              <div key={index} className="grid grid-cols-1 gap-3 sm:grid-cols-[200px_1fr_auto] sm:items-end">
                <FormField label="Nome">
                  <Input
                    value={variant.name}
                    onChange={(event) => updateRow("variants", index, "name", event.target.value)}
                    placeholder="Ex.: Tamanho"
                    maxLength={60}
                  />
                </FormField>
                <FormField label="Opções (separadas por vírgula)">
                  <Input
                    value={variant.options}
                    onChange={(event) => updateRow("variants", index, "options", event.target.value)}
                    placeholder="Ex.: P, M, G"
                  />
                </FormField>
                <Button
                  type="button"
                  variant="outline"
                  aria-label={`Remover variação ${variant.name}`}
                  onClick={() => setForm((previous) => ({ ...previous, variants: previous.variants.filter((_, i) => i !== index) }))}
                >
                  <Trash2 size={16} />
                </Button>
              </div>
            ))}
          </div>

          {form.variants.length < 5 && (
            <Button
              type="button"
              variant="outline"
              className="mt-4"
              onClick={() => setForm((previous) => ({ ...previous, variants: [...previous.variants, { name: "", options: "" }] }))}
            >
              <Plus size={16} className="mr-2" />
              Adicionar variação
            </Button>
          )}
        </Card>

        <Card className="p-5 sm:p-6">
          <h2 className="mb-2 text-lg font-semibold text-text">
            Características
          </h2>

          <p className="mb-5 text-sm text-text-secondary">
            Ficha técnica exibida na página do produto (ex.: Material: Algodão).
          </p>

          <div className="space-y-3">
            {form.attributes.map((attribute, index) => (
              <div key={index} className="grid grid-cols-1 gap-3 sm:grid-cols-[200px_1fr_auto] sm:items-end">
                <FormField label="Característica">
                  <Input
                    value={attribute.name}
                    onChange={(event) => updateRow("attributes", index, "name", event.target.value)}
                    placeholder="Ex.: Material"
                    maxLength={60}
                  />
                </FormField>
                <FormField label="Valor">
                  <Input
                    value={attribute.value}
                    onChange={(event) => updateRow("attributes", index, "value", event.target.value)}
                    placeholder="Ex.: Algodão"
                    maxLength={255}
                  />
                </FormField>
                <Button
                  type="button"
                  variant="outline"
                  aria-label={`Remover característica ${attribute.name}`}
                  onClick={() => setForm((previous) => ({ ...previous, attributes: previous.attributes.filter((_, i) => i !== index) }))}
                >
                  <Trash2 size={16} />
                </Button>
              </div>
            ))}
          </div>

          {form.attributes.length < 30 && (
            <Button
              type="button"
              variant="outline"
              className="mt-4"
              onClick={() => setForm((previous) => ({ ...previous, attributes: [...previous.attributes, { name: "", value: "" }] }))}
            >
              <Plus size={16} className="mr-2" />
              Adicionar característica
            </Button>
          )}
        </Card>

        <Card className="p-5 sm:p-6">
          <h2 className="mb-2 text-lg font-semibold text-text">
            Imagem do produto
          </h2>

          <p className="mb-5 text-sm text-text-secondary">
            Adicione uma imagem para apresentar o produto aos clientes.
          </p>

          {shownImage ? (
            <div className="relative max-w-xs overflow-hidden rounded-lg border border-border">
              <img src={shownImage} alt="Imagem do produto" className="aspect-square w-full object-cover" />
              <button
                type="button"
                onClick={removeImage}
                className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white text-text shadow-sm transition-colors hover:bg-gray-100"
                aria-label="Remover imagem"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <label className="flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-background-secondary p-6 text-center transition-colors hover:bg-background">
              <ImagePlus size={32} className="mb-3 text-text-secondary" />

              <p className="text-sm font-medium text-text">
                Upload de imagem
              </p>

              <p className="mt-1 text-xs text-text-secondary">
                PNG, JPG ou WEBP, até 5 MB
              </p>

              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleImage}
                className="sr-only"
              />
            </label>
          )}
        </Card>

        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}

        {deleteBlocked && (
          <div role="alert" className="rounded-md border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
            Este produto já tem pedidos e não pode ser excluído (o histórico das vendas é mantido).
            Você pode desativá-lo para tirá-lo da vitrine.
            <div className="mt-3">
              <Button type="button" variant="outline" onClick={handleDeactivate} disabled={saving}>
                Desativar produto
              </Button>
            </div>
          </div>
        )}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
          <div>
            {isEditing && !deleteBlocked && (
              confirmDelete ? (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm text-text">Excluir este produto?</span>
                  <Button type="button" variant="danger" onClick={handleDelete} disabled={saving}>
                    Sim, excluir
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setConfirmDelete(false)} disabled={saving}>
                    Não
                  </Button>
                </div>
              ) : (
                <Button type="button" variant="outline" onClick={() => setConfirmDelete(true)}>
                  <Trash2 size={16} className="mr-2" />
                  Excluir produto
                </Button>
              )
            )}
          </div>

          <div className="flex flex-col-reverse gap-3 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/store/produtos")}
            >
              <X size={16} className="mr-2" />
              Cancelar
            </Button>

            <Button type="submit" disabled={saving}>
              <Save size={16} className="mr-2" />
              {saving ? "Salvando..." : isEditing ? "Salvar alterações" : "Cadastrar produto"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
