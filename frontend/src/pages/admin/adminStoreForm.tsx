import { useState, type ChangeEvent, type DragEvent, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ImagePlus, X } from "lucide-react";

import { PageHeader } from "../../components/layout/pageHeader";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { FormField } from "../../components/ui/formField";
import { Input } from "../../components/ui/input";
import { RequestStatus } from "../../components/ui/requestStatus";
import { useRequest } from "../../hooks/useRequest";
import { ApiError, errorMessage } from "../../lib/api";
import {
  createAdminStore,
  getAdminStore,
  updateAdminStore,
  uploadAdminStoreImage,
} from "../../lib/admin/adminService";
import { storeCategories } from "../../lib/categories";
import { formatCnpj, isValidCnpj, normalizeCnpj } from "../../lib/cnpj";
import { isUuid } from "../../lib/format";
import type { AdminStore, AdminStoreUpdate } from "../../types/admin";

interface StoreFormState {
  nome: string;
  email: string;
  senha: string;
  cnpj: string;
  telefone: string;
  categoria: string;
  ativa: boolean;
}

type FormErrors = Partial<Record<keyof StoreFormState, string>>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];

function emptyForm(): StoreFormState {
  return { nome: "", email: "", senha: "", cnpj: "", telefone: "", categoria: "", ativa: true };
}

function fromStore(store: AdminStore): StoreFormState {
  return {
    nome: store.nome,
    email: store.responsavel_email ?? "",
    senha: "",
    cnpj: formatCnpj(store.cnpj),
    telefone: store.telefone ?? "",
    categoria: store.categoria ?? "",
    ativa: store.ativa,
  };
}

function validate(form: StoreFormState, isEdit: boolean, requireEmail: boolean): FormErrors {
  const errors: FormErrors = {};

  if (form.nome.trim().length < 2) errors.nome = "Informe o nome da loja.";

  if (!form.email.trim()) {
    if (requireEmail) errors.email = "Informe o e-mail.";
  } else if (!EMAIL_PATTERN.test(form.email.trim())) errors.email = "Informe um e-mail válido.";

  if (!isEdit) {
    if (!form.senha) errors.senha = "Defina uma senha.";
    else if (form.senha.length < 8) errors.senha = "A senha deve ter pelo menos 8 caracteres.";
  }

  if (!isValidCnpj(form.cnpj)) errors.cnpj = "Informe um CNPJ válido.";

  const telefoneDigits = form.telefone.replace(/\D/g, "").length;
  if (telefoneDigits < 10 || telefoneDigits > 11 || !/^[0-9()+\-\s]+$/.test(form.telefone.trim())) {
    errors.telefone = "Informe um telefone com DDD.";
  }

  if (!form.categoria) errors.categoria = "Escolha uma categoria.";

  return errors;
}

export function AdminStoreFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = id !== undefined;

  const request = useRequest(isEdit ? `admin-loja:${id}` : null, () =>
    isUuid(id) ? getAdminStore(id) : Promise.reject(new ApiError("Loja não encontrada", 404))
  );
  const store = request.data;

  if (isEdit && request.loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Editar loja" />
        <RequestStatus loading loadingText="Carregando loja..." />
      </div>
    );
  }

  if (isEdit && !store) {
    return (
      <div className="space-y-6">
        <PageHeader title="Editar loja" />
        <Card className="p-6">
          <p className="text-sm text-text-secondary">{request.error ?? "Loja não encontrada."}</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate("/admin/lojas")}>
            Voltar para as lojas
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <AdminStoreForm
      key={store?.id ?? "nova"}
      store={store}
      onCancel={() => navigate("/admin/lojas")}
      onSubmitted={(notice) => navigate("/admin/lojas", { state: { notice } })}
    />
  );
}

interface AdminStoreFormProps {
  store?: AdminStore;
  onCancel: () => void;
  onSubmitted: (notice: string) => void;
}

function AdminStoreForm({ store, onCancel, onSubmitted }: AdminStoreFormProps) {
  const isEdit = Boolean(store);
  const initialForm = store ? fromStore(store) : emptyForm();
  const [form, setForm] = useState<StoreFormState>(initialForm);
  const [errors, setErrors] = useState<FormErrors>({});
  const [logoUrl, setLogoUrl] = useState<string | null>(store?.logo_url ?? null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function updateField<K extends keyof StoreFormState>(field: K, value: StoreFormState[K]) {
    setForm((current) => ({ ...current, [field]: value }));
    setError("");
  }

  function handleLogo(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) pickLogo(file);
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file) pickLogo(file);
  }

  function pickLogo(file: File) {
    if (!IMAGE_TYPES.includes(file.type)) {
      setError("Use uma imagem PNG, JPG ou WEBP.");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setError("A logo pode ter no máximo 5 MB.");
      return;
    }
    if (logoPreview) URL.revokeObjectURL(logoPreview);
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
    setError("");
  }

  function removeLogo() {
    if (logoPreview) URL.revokeObjectURL(logoPreview);
    setLogoFile(null);
    setLogoPreview(null);
    setLogoUrl(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;

    const nextErrors = validate(form, isEdit, !isEdit || Boolean(store?.responsavel_email));
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSaving(true);
    setError("");
    try {
      if (!store) {
        const created = await createAdminStore({
          nome: form.nome.trim(),
          email: form.email.trim(),
          senha: form.senha,
          cnpj: normalizeCnpj(form.cnpj),
          telefone: form.telefone.trim(),
          categoria: form.categoria,
        });
        if (logoFile) {
          try {
            const { url } = await uploadAdminStoreImage(created.id, logoFile, "logo");
            await updateAdminStore(created.id, { logo_url: url });
          } catch (caught) {
            onSubmitted(`A loja "${created.nome}" foi cadastrada, mas a logo não foi salva (${errorMessage(caught)}). Envie de novo pela edição.`);
            return;
          }
        }
        onSubmitted(`A loja "${created.nome}" foi cadastrada. O lojista já pode entrar com ${form.email.trim().toLowerCase()}.`);
        return;
      }

      const changes: AdminStoreUpdate = {};
      if (form.nome.trim() !== initialForm.nome) changes.nome = form.nome.trim();
      if (form.email.trim().toLowerCase() !== initialForm.email.toLowerCase() && form.email.trim()) {
        changes.email = form.email.trim();
      }
      if (normalizeCnpj(form.cnpj) !== normalizeCnpj(initialForm.cnpj)) changes.cnpj = normalizeCnpj(form.cnpj);
      if (form.telefone.trim() !== initialForm.telefone) changes.telefone = form.telefone.trim();
      if (form.categoria !== initialForm.categoria) changes.categoria = form.categoria;
      if (form.ativa !== initialForm.ativa) changes.ativa = form.ativa;
      if (logoFile) {
        changes.logo_url = (await uploadAdminStoreImage(store.id, logoFile, "logo")).url;
      } else if (logoUrl !== (store.logo_url ?? null)) {
        changes.logo_url = logoUrl;
      }

      if (Object.keys(changes).length > 0) await updateAdminStore(store.id, changes);
      onSubmitted(`As alterações da loja "${form.nome.trim()}" foram salvas.`);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setSaving(false);
    }
  }

  const shownLogo = logoPreview ?? logoUrl;

  return (
    <div className="space-y-6">
      <PageHeader
        title={isEdit ? "Editar loja" : "Cadastro de loja"}
        description="Preencha os dados da loja que será cadastrada na plataforma."
      />

      <Card className="mx-auto max-w-2xl p-6 sm:p-8">
        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          <FormField label="Nome da loja" required error={errors.nome}>
            <Input
              value={form.nome}
              onChange={(event) => updateField("nome", event.target.value)}
              placeholder="Ex.: StreetWear BR"
              error={!!errors.nome}
            />
          </FormField>

          <FormField
            label={isEdit ? "E-mail do responsável" : "E-mail"}
            required={!isEdit || Boolean(store?.responsavel_email)}
            error={errors.email}
            helperText={
              isEdit
                ? store?.responsavel_email
                  ? "Trocar o e-mail muda o login do lojista responsável."
                  : "Informe o e-mail de uma conta já cadastrada para vinculá-la como responsável."
                : "Será o login do lojista responsável pela loja."
            }
          >
            <Input
              type="email"
              value={form.email}
              onChange={(event) => updateField("email", event.target.value)}
              placeholder="email@loja.com"
              error={!!errors.email}
            />
          </FormField>

          {!isEdit && (
            <FormField label="Senha" required error={errors.senha} helperText="Mínimo de 8 caracteres.">
              <Input
                type="password"
                value={form.senha}
                onChange={(event) => updateField("senha", event.target.value)}
                placeholder="••••••••"
                error={!!errors.senha}
              />
            </FormField>
          )}

          <div className="grid gap-5 sm:grid-cols-2">
            <FormField label="CNPJ" required error={errors.cnpj}>
              <Input
                value={form.cnpj}
                onChange={(event) => updateField("cnpj", event.target.value)}
                placeholder="00.000.000/0001-00"
                maxLength={18}
                error={!!errors.cnpj}
              />
            </FormField>

            <FormField label="Telefone" required error={errors.telefone}>
              <Input
                value={form.telefone}
                onChange={(event) => updateField("telefone", event.target.value)}
                placeholder="(11) 99999-9999"
                error={!!errors.telefone}
              />
            </FormField>
          </div>

          <FormField label="Categoria" required error={errors.categoria}>
            <select
              value={form.categoria}
              onChange={(event) => updateField("categoria", event.target.value)}
              className={`w-full rounded-md border bg-white px-3 py-2 text-sm text-text outline-none focus:border-primary focus:ring-1 focus:ring-primary ${
                errors.categoria ? "border-danger" : "border-border"
              }`}
            >
              <option value="">Selecione uma categoria</option>
              {storeCategories.map((categoria) => (
                <option key={categoria} value={categoria}>
                  {categoria}
                </option>
              ))}
            </select>
          </FormField>

          {isEdit && (
            <FormField label="Status">
              <select
                value={form.ativa ? "ativo" : "inativo"}
                onChange={(event) => updateField("ativa", event.target.value === "ativo")}
                className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm text-text outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              >
                <option value="ativo">Ativa (aparece no marketplace)</option>
                <option value="inativo">Inativa (fora do marketplace, sem novos pedidos)</option>
              </select>
            </FormField>
          )}

          <FormField label="Logo da loja">
            {shownLogo ? (
              <div className="flex items-center gap-4 rounded-lg border border-border bg-background px-4 py-4">
                <img src={shownLogo} alt="Logo da loja" className="h-16 w-16 rounded-lg object-cover" />
                <span className="min-w-0 flex-1 truncate text-sm text-text-secondary">
                  {logoFile?.name ?? "Logo atual"}
                </span>
                <button
                  type="button"
                  onClick={removeLogo}
                  aria-label="Remover logo"
                  className="flex h-8 w-8 items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-background-secondary hover:text-text"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <label
                onDragOver={(event) => event.preventDefault()}
                onDrop={handleDrop}
                className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-background px-4 py-6 text-center text-sm text-text-secondary transition-colors hover:bg-background-secondary"
              >
                <ImagePlus size={24} />
                <span>Clique ou arraste sua logo aqui</span>
                <span className="text-xs">PNG, JPG ou WEBP, até 5 MB</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={handleLogo}
                />
              </label>
            )}
          </FormField>

          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}

          <div className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Salvando..." : isEdit ? "Salvar alterações" : "Cadastrar loja"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
