import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";

import { PageHeader } from "../../components/layout/pageHeader";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { FormField } from "../../components/ui/formField";
import { Input } from "../../components/ui/input";
import type { PermissaoAdmin, TipoAdministrador } from "../../types/admin";

const TIPOS: TipoAdministrador[] = ["Admin", "Gerente", "Suporte"];

const PERMISSOES: { value: PermissaoAdmin; label: string }[] = [
  { value: "lojas", label: "Gerenciar lojas" },
  { value: "produtos", label: "Gerenciar produtos" },
  { value: "usuarios", label: "Gerenciar usuários" },
  { value: "relatorios", label: "Visualizar relatórios" },
];

interface AccountFormErrors {
  nome?: string;
  email?: string;
  senha?: string;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function AdminAccountFormPage() {
  const navigate = useNavigate();

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [tipo, setTipo] = useState<TipoAdministrador>("Admin");
  const [permissoes, setPermissoes] = useState<PermissaoAdmin[]>([]);
  const [errors, setErrors] = useState<AccountFormErrors>({});

  function togglePermissao(permissao: PermissaoAdmin) {
    setPermissoes((current) =>
      current.includes(permissao) ? current.filter((item) => item !== permissao) : [...current, permissao]
    );
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors: AccountFormErrors = {};
    if (!nome.trim()) nextErrors.nome = "Informe o nome completo.";
    if (!email.trim()) nextErrors.email = "Informe o e-mail.";
    else if (!EMAIL_PATTERN.test(email.trim())) nextErrors.email = "Informe um e-mail válido.";
    if (!senha) nextErrors.senha = "Defina uma senha.";
    else if (senha.length < 8) nextErrors.senha = "A senha deve ter pelo menos 8 caracteres.";

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    navigate("/admin/usuarios", {
      state: { notice: "Cadastro simulado: o administrador não foi salvo no servidor." },
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Adicionar administrador"
        description="Cadastre um novo administrador e defina seu nível de acesso."
      />

      <Card className="mx-auto max-w-2xl p-6 sm:p-8">
        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          <FormField label="Nome" required error={errors.nome}>
            <Input
              value={nome}
              onChange={(event) => setNome(event.target.value)}
              placeholder="Nome completo"
              error={!!errors.nome}
            />
          </FormField>

          <FormField label="E-mail" required error={errors.email}>
            <Input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="email@admin.com"
              error={!!errors.email}
            />
          </FormField>

          <FormField label="Senha" required error={errors.senha} helperText="Mínimo de 8 caracteres.">
            <Input
              type="password"
              value={senha}
              onChange={(event) => setSenha(event.target.value)}
              placeholder="••••••••"
              error={!!errors.senha}
            />
          </FormField>

          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-text">Tipo de administrador</span>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {TIPOS.map((item) => {
                const selected = tipo === item;

                return (
                  <button
                    key={item}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setTipo(item)}
                    className={`rounded-md border px-3 py-2 text-sm transition-colors ${
                      selected
                        ? "border-primary bg-white font-semibold text-text ring-1 ring-primary"
                        : "border-border bg-white text-text-secondary hover:bg-background"
                    }`}
                  >
                    {item}
                  </button>
                );
              })}
            </div>
          </div>

          <fieldset className="space-y-2">
            <legend className="mb-2 text-sm font-medium text-text">Permissões</legend>
            {PERMISSOES.map((permissao) => (
              <label key={permissao.value} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={permissoes.includes(permissao.value)}
                  onChange={() => togglePermissao(permissao.value)}
                  className="h-4 w-4 rounded border-border"
                />
                <span className="text-sm text-text">{permissao.label}</span>
              </label>
            ))}
          </fieldset>

          <div className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => navigate("/admin/usuarios")}>
              Cancelar
            </Button>
            <Button type="submit">Cadastrar administrador</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
