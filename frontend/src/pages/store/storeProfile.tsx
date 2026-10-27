import { useState, type ChangeEvent, type FormEvent } from "react";
import {
  Store,
  Phone,
  Mail,
  ImagePlus,
  Save,
  X,
} from "lucide-react";

import { PageHeader } from "../../components/layout/pageHeader";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { FormField } from "../../components/ui/formField";
import { useStore } from "../../components/layout/storeContext";
import { errorMessage } from "../../lib/api";
import { storeCategories } from "../../lib/categories";
import { updateStore, uploadImage } from "../../lib/services";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];

interface ImageSlotProps {
  label: string;
  addText: string;
  current: string | null;
  disabled: boolean;
  wide?: boolean;
  onPick: (file: File) => void;
  onRemove: () => void;
}

function ImageSlot({ label, addText, current, disabled, wide, onPick, onRemove }: ImageSlotProps) {
  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) onPick(file);
  }

  return (
    <div>
      <p className="mb-2 text-sm font-medium text-text">{label}</p>

      {current ? (
        <div className="relative flex min-h-36 items-center justify-center overflow-hidden rounded-lg border border-border bg-background-secondary">
          <img
            src={current}
            alt={label}
            className={wide ? "h-36 w-full object-cover" : "h-28 w-28 rounded-lg object-cover"}
          />
          <button
            type="button"
            onClick={onRemove}
            disabled={disabled}
            className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white text-text shadow-sm transition-colors hover:bg-gray-100"
            aria-label={`Remover ${label.toLowerCase()}`}
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        <label className="flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-border bg-background-secondary p-5 text-center">
          <ImagePlus size={26} className="mb-2 text-text-secondary" />
          <p className="text-sm font-medium text-text">
            {disabled ? "Enviando..." : addText}
          </p>
          <p className="mt-1 text-xs text-text-secondary">
            PNG, JPG ou WEBP, até 5 MB
          </p>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={handleChange}
            disabled={disabled}
            className="sr-only"
          />
        </label>
      )}
    </div>
  );
}

export function StoreProfile() {
  const { loja, setLoja } = useStore();
  const [name, setName] = useState(loja.nome);
  const [description, setDescription] = useState(loja.descricao ?? "");
  const [category, setCategory] = useState(loja.categoria ?? "");
  const [email, setEmail] = useState(loja.email_contato ?? "");
  const [phone, setPhone] = useState(loja.telefone ?? "");
  const [logo, setLogo] = useState<string | null>(loja.logo_url ?? null);
  const [banner, setBanner] = useState<string | null>(loja.banner_url ?? null);
  const [uploading, setUploading] = useState<"logo" | "banner" | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  async function handleImage(tipo: "logo" | "banner", file: File) {
    if (!IMAGE_TYPES.includes(file.type)) return setError("Use uma imagem PNG, JPG ou WEBP.");
    if (file.size > MAX_IMAGE_BYTES) return setError("A imagem pode ter no máximo 5 MB.");
    setUploading(tipo);
    setError("");
    setSaved(false);
    try {
      const { url } = await uploadImage(file, tipo);
      if (tipo === "logo") setLogo(url);
      else setBanner(url);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setUploading(null);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || uploading) return;

    if (name.trim().length < 2) return setError("O nome da loja precisa ter pelo menos 2 caracteres.");
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setError("Informe um e-mail válido.");
    if (phone.trim() && !/^[0-9()+\-\s]{8,20}$/.test(phone.trim())) return setError("Informe um telefone válido, só com números, espaços, parênteses e hífen.");

    setSaving(true);
    setError("");
    try {
      const updated = await updateStore(loja.id, {
        nome: name.trim(),
        descricao: description.trim() || null,
        categoria: category || null,
        email_contato: email.trim() || null,
        telefone: phone.trim() || null,
        logo_url: logo,
        banner_url: banner,
      });
      setLoja(updated);
      setSaved(true);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Minha loja"
        description="Gerencie as informações que seus clientes veem no marketplace."
      />

      <form onSubmit={handleSubmit} className="space-y-6" noValidate>
        {/* Identidade da loja */}
        <Card className="p-5 sm:p-6">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-background-secondary">
              <Store size={22} className="text-text" />
            </div>

            <div>
              <h2 className="font-semibold text-text">
                Identidade da loja
              </h2>
              <p className="mt-1 text-sm text-text-secondary">
                Nome, descrição e categoria da sua loja.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="md:col-span-2">
              <FormField label="Nome da loja">
                <Input
                  type="text"
                  value={name}
                  onChange={(event) => {
                    setName(event.target.value);
                    setSaved(false);
                  }}
                  placeholder="Nome da sua loja"
                  required
                />
              </FormField>
            </div>

            <div className="md:col-span-2">
              <FormField label="Descrição">
                <textarea
                  value={description}
                  onChange={(event) => {
                    setDescription(event.target.value);
                    setSaved(false);
                  }}
                  placeholder="Conte um pouco sobre sua loja..."
                  rows={4}
                  maxLength={5000}
                  className="w-full resize-y rounded-md border border-border bg-white px-3 py-2 text-sm text-text outline-none transition-colors placeholder:text-muted focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </FormField>
            </div>

            <div className="md:col-span-2">
              <FormField label="Categoria principal">
                <select
                  value={category}
                  onChange={(event) => {
                    setCategory(event.target.value);
                    setSaved(false);
                  }}
                  className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm text-text outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
                >
                  <option value="">Selecione uma categoria</option>
                  {storeCategories.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                  {category && !storeCategories.includes(category) && (
                    <option value={category}>{category}</option>
                  )}
                </select>
              </FormField>
            </div>
          </div>
        </Card>

        {/* Logo e banner */}
        <Card className="p-5 sm:p-6">
          <div className="mb-5">
            <h2 className="font-semibold text-text">
              Identidade visual
            </h2>
            <p className="mt-1 text-sm text-text-secondary">
              Personalize a apresentação da sua loja.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <ImageSlot
              label="Logo"
              addText="Adicionar logo"
              current={logo}
              disabled={uploading !== null || saving}
              onPick={(file) => handleImage("logo", file)}
              onRemove={() => {
                setLogo(null);
                setSaved(false);
              }}
            />

            <ImageSlot
              label="Banner"
              addText="Adicionar banner"
              current={banner}
              disabled={uploading !== null || saving}
              wide
              onPick={(file) => handleImage("banner", file)}
              onRemove={() => {
                setBanner(null);
                setSaved(false);
              }}
            />
          </div>
        </Card>

        {/* Contato */}
        <Card className="p-5 sm:p-6">
          <div className="mb-6">
            <h2 className="font-semibold text-text">
              Contato
            </h2>
            <p className="mt-1 text-sm text-text-secondary">
              Informações para atendimento da loja.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <FormField label="E-mail comercial">
              <div className="relative">
                <Mail
                  size={17}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
                />
                <Input
                  type="email"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    setSaved(false);
                  }}
                  placeholder="contato@loja.com"
                  className="pl-9"
                  maxLength={255}
                />
              </div>
            </FormField>

            <FormField label="Telefone">
              <div className="relative">
                <Phone
                  size={17}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
                />
                <Input
                  type="tel"
                  value={phone}
                  onChange={(event) => {
                    setPhone(event.target.value);
                    setSaved(false);
                  }}
                  placeholder="(47) 99999-9999"
                  className="pl-9"
                  maxLength={20}
                />
              </div>
            </FormField>

          </div>
        </Card>

        {/* Ações */}
        <div className="flex flex-col-reverse justify-between gap-3 sm:flex-row sm:items-center">
          <p className="text-xs text-text-secondary">
            Nome, descrição, imagens e contato aparecem na página pública da loja.
          </p>

          <Button type="submit" disabled={saving || uploading !== null}>
            <Save size={16} className="mr-2" />
            {saving ? "Salvando..." : "Salvar alterações"}
          </Button>
        </div>

        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}

        {saved && (
          <div
            role="status"
            className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700"
          >
            Dados da loja salvos.
          </div>
        )}
      </form>
    </div>
  );
}