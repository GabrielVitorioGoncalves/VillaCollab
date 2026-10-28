import { useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ImagePlus } from "lucide-react";

import { PageHeader } from "../../components/layout/pageHeader";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { FormField } from "../../components/ui/formField";
import { Input } from "../../components/ui/input";
import { RequestStatus } from "../../components/ui/requestStatus";
import { useRequest } from "../../hooks/useRequest";
import { listAdminStores } from "../../lib/admin/adminService";
import { storeCategories } from "../../lib/categories";
import type { AdminStore } from "../../types/admin";

interface StoreFormState {
  nome: string;
  email: string;
  senha: string;
  cnpj: string;
  telefone: string;
  categoria: string;
  logo: string;
}

type FormErrors = Partial<Record<keyof StoreFormState, string>>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function emptyForm(): StoreFormState {
  return { nome: "", email: "", senha: "", cnpj: "", telefone: "", categoria: "", logo: "" };
}

function fromStore(store: AdminStore): StoreFormState {
  return {
    nome: store.nome,
    email: store.responsavel,
    senha: "",
    cnpj: store.cnpj,
    telefone: store.telefone,
    categoria: store.categoria,
    logo: "",
  };
}

function validate(form: StoreFormState, isEdit: boolean): FormErrors {
  const errors: FormErrors = {};

  if (!form.nome.trim()) errors.nome = "Informe o nome da loja.";

  if (!form.email.trim()) errors.email = "Informe o e-mail.";
  else if (!EMAIL_PATTERN.test(form.email.trim())) errors.email = "Informe um e-mail válido.";

  if (!isEdit) {
    if (!form.senha) errors.senha = "Defina uma senha.";
    else if (form.senha.length < 8) errors.senha = "A senha deve ter pelo menos 8 caracteres.";
  }

  if (form.cnpj.replace(/\D/g, "").length !== 14) errors.cnpj = "O CNPJ deve ter 14 dígitos.";

  const telefoneDigits = form.telefone.replace(/\D/g, "").length;
  if (telefoneDigits < 10 || telefoneDigits > 11) errors.telefone = "Informe um telefone com DDD.";

  if (!form.categoria) errors.categoria = "Escolha uma categoria.";

  return errors;
}

export function AdminStoreFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = id !== undefined;

  const request = useRequest(isEdit ? "admin-lojas" : null, listAdminStores);
  const store = request.data?.find((item) => item.id === id);

  if (isEdit && !request.data) {
    return (
      <div className="space-y-6">
        <PageHeader title="Editar loja" />
        <RequestStatus
          loading={request.loading}
          error={request.error}
          onRetry={request.reload}
          loadingText="Carregando loja..."
        />
      </div>
    );
  }

  if (isEdit && !store) {
    return (
      <div className="space-y-6">
        <PageHeader title="Editar loja" />
        <Card className="p-6">
          <p className="text-sm text-text-secondary">Loja não encontrada.</p>
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
      initialForm={store ? fromStore(store) : emptyForm()}
      isEdit={isEdit}
      onCancel={() => navigate("/admin/lojas")}
      onSubmitted={(notice) => navigate("/admin/lojas", { state: { notice } })}
    />
  );
}

interface AdminStoreFormProps {
  initialForm: StoreFormState;
  isEdit: boolean;
  onCancel: () => void;
  onSubmitted: (notice: string) => void;
}

function AdminStoreForm({ initialForm, isEdit, onCancel, onSubmitted }: AdminStoreFormProps) {
  const [form, setForm] = useState<StoreFormState>(initialForm);
  const [errors, setErrors] = useState<FormErrors>({});

  function updateField<K extends keyof StoreFormState>(field: K, value: StoreFormState[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors = validate(form, isEdit);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    onSubmitted(
      isEdit
        ? "Alterações simuladas: nada foi salvo no servidor."
        : "Cadastro simulado: a loja não foi salva no servidor."
    );
  }

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

          <FormField label="E-mail" required error={errors.email}>
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

          <FormField label="Logo da loja">
            <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-background px-4 py-6 text-center text-sm text-text-secondary transition-colors hover:bg-background-secondary">
              <ImagePlus size={24} />
              <span>{form.logo || "Clique ou arraste sua logo aqui"}</span>
              <span className="text-xs">PNG, JPG ou WEBP</span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(event) => updateField("logo", event.target.files?.[0]?.name ?? "")}
              />
            </label>
          </FormField>

          <div className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
            <Button type="submit">{isEdit ? "Salvar alterações" : "Cadastrar loja"}</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
