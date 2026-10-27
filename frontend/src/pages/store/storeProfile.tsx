import { useState } from "react";
import {
  Store,
  Phone,
  Mail,
  ImagePlus,
  Save,
} from "lucide-react";

import { PageHeader } from "../../components/layout/pageHeader";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { FormField } from "../../components/ui/formField";

export function StoreProfile() {
  const [name, setName] = useState("Minha Loja");
  const [description, setDescription] = useState(
    "Uma loja dedicada a oferecer produtos de qualidade aos nossos clientes.",
  );
  const [category, setCategory] = useState("Moda e acessórios");
  const [email, setEmail] = useState("contato@minhaloja.com");
  const [phone, setPhone] = useState("(47) 99999-0000");
  const [saved, setSaved] = useState(false);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const storeData = {
      name,
      description,
      category,
      email,
      phone,
    };

    // Simulação de salvamento até a integração com o backend.
    console.log("Dados da loja:", storeData);
    setSaved(true);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Minha loja"
        description="Gerencie as informações que seus clientes veem no marketplace."
      />

      <form onSubmit={handleSubmit} className="space-y-6">
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
                  required
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
                  required
                  className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm text-text outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
                >
                  <option value="">Selecione uma categoria</option>
                  <option value="Moda e acessórios">Moda e acessórios</option>
                  <option value="Casa e decoração">Casa e decoração</option>
                  <option value="Eletrônicos">Eletrônicos</option>
                  <option value="Beleza e cuidados pessoais">
                    Beleza e cuidados pessoais
                  </option>
                  <option value="Esportes">Esportes</option>
                  <option value="Alimentos e bebidas">
                    Alimentos e bebidas
                  </option>
                  <option value="Outros">Outros</option>
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
            <div>
              <p className="mb-2 text-sm font-medium text-text">Logo</p>

              <div className="flex min-h-36 flex-col items-center justify-center rounded-lg border border-dashed border-border bg-background-secondary p-5 text-center">
                <ImagePlus size={26} className="mb-2 text-text-secondary" />
                <p className="text-sm font-medium text-text">
                  Adicionar logo
                </p>
                <p className="mt-1 text-xs text-text-secondary">
                  Envio de imagem será implementado posteriormente.
                </p>
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-text">Banner</p>

              <div className="flex min-h-36 flex-col items-center justify-center rounded-lg border border-dashed border-border bg-background-secondary p-5 text-center">
                <ImagePlus size={26} className="mb-2 text-text-secondary" />
                <p className="text-sm font-medium text-text">
                  Adicionar banner
                </p>
                <p className="mt-1 text-xs text-text-secondary">
                  Envio de imagem será implementado posteriormente.
                </p>
              </div>
            </div>
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
                  required
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
                  required
                />
              </div>
            </FormField>

          </div>
        </Card>

        {/* Ações */}
        <div className="flex flex-col-reverse justify-between gap-3 sm:flex-row sm:items-center">
          <p className="text-xs text-text-secondary">
            As alterações ainda não são persistidas no banco de dados.
          </p>

          <Button type="submit">
            <Save size={16} className="mr-2" />
            Salvar alterações
          </Button>
        </div>

        {saved && (
          <div
            role="status"
            className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700"
          >
            Dados simulados da loja salvos nesta tela.
          </div>
        )}
      </form>
    </div>
  );
}