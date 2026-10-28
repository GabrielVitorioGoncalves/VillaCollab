import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";

import { AdminAccessFields } from "../../components/admin/adminAccessFields";
import { useAdmin } from "../../components/layout/adminContext";
import { PageHeader } from "../../components/layout/pageHeader";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { FormField } from "../../components/ui/formField";
import { Input } from "../../components/ui/input";
import { errorMessage } from "../../lib/api";
import { createAdminAccount } from "../../lib/admin/adminService";
import type { PermissaoAdmin, TipoAdministrador } from "../../types/admin";

interface AccountFormErrors {
  nome?: string;
  email?: string;
  senha?: string;
  permissoes?: string;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function AdminAccountFormPage() {
  const navigate = useNavigate();
  const { me } = useAdmin();
  const podeAdmin = me.permissoes.length === 4;

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [tipo, setTipo] = useState<TipoAdministrador>(podeAdmin ? "Admin" : "Suporte");
  const [permissoes, setPermissoes] = useState<PermissaoAdmin[]>([]);
  const [errors, setErrors] = useState<AccountFormErrors>({});
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;

    const nextErrors: AccountFormErrors = {};
    if (nome.trim().length < 2) nextErrors.nome = "Informe o nome completo.";
    if (!email.trim()) nextErrors.email = "Informe o e-mail.";
    else if (!EMAIL_PATTERN.test(email.trim())) nextErrors.email = "Informe um e-mail válido.";
    if (!senha) nextErrors.senha = "Defina uma senha.";
    else if (senha.length < 8) nextErrors.senha = "A senha deve ter pelo menos 8 caracteres.";
    if (tipo !== "Admin" && permissoes.length === 0) nextErrors.permissoes = "Escolha pelo menos uma permissão.";

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSaving(true);
    setError("");
    try {
      await createAdminAccount({
        nome: nome.trim(),
        email: email.trim(),
        senha,
        admin_tipo: tipo,
        ...(tipo === "Admin" ? {} : { admin_permissoes: permissoes }),
      });
      navigate("/admin/usuarios", {
        state: { notice: `O administrador ${nome.trim()} foi cadastrado e já pode entrar com ${email.trim().toLowerCase()}.` },
      });
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setSaving(false);
    }
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

          <AdminAccessFields
            tipo={tipo}
            permissoes={permissoes}
            disponiveis={me.permissoes}
            onTipoChange={setTipo}
            onPermissoesChange={setPermissoes}
            error={errors.permissoes}
          />

          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}

          <div className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => navigate("/admin/usuarios")} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Cadastrando..." : "Cadastrar administrador"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
