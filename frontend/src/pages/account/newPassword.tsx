import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";

import { AccountShell } from "../../components/layout/accountShell";
import { Button } from "../../components/ui/button";
import { FormField } from "../../components/ui/formField";
import { Input } from "../../components/ui/input";
import { errorMessage } from "../../lib/api";
import { changePassword, logout } from "../../lib/services";
import { getSession, paginaInicial, proximaEtapaDeSeguranca, updateSessionUser } from "../../lib/session";

const inputClass = "h-[52px] rounded-[8px] border border-black bg-[#F4F4F5] px-[14px] text-base text-black";

export function NewPasswordPage() {
  const navigate = useNavigate();
  const session = getSession();
  const [atual, setAtual] = useState("");
  const [nova, setNova] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  if (!session) return <Navigate to="/" replace />;
  if (!session.usuario?.trocar_senha) {
    return <Navigate to={proximaEtapaDeSeguranca(session) ?? paginaInicial(session.usuario?.role)} replace />;
  }
  const usuario = session.usuario;

  async function enviar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (salvando) return;
    if (nova.length < 8) return setErro("A nova senha precisa ter pelo menos 8 caracteres.");
    if (nova !== confirmacao) return setErro("A confirmação não é igual à nova senha.");
    if (nova === atual) return setErro("A nova senha precisa ser diferente da provisória.");
    setSalvando(true);
    setErro("");
    try {
      await changePassword(atual, nova);
      updateSessionUser({ ...usuario, trocar_senha: false });
      navigate(proximaEtapaDeSeguranca() ?? paginaInicial(usuario.role), { replace: true });
    } catch (caught) {
      setErro(errorMessage(caught));
      setSalvando(false);
    }
  }

  async function sair() {
    await logout();
    navigate("/", { replace: true });
  }

  return (
    <AccountShell
      title="Defina sua senha"
      description="Sua conta foi criada com uma senha provisória. Escolha uma senha só sua para continuar."
    >
      <form onSubmit={enviar} className="space-y-4" noValidate>
        {erro && <p role="alert" className="text-sm text-red-700">{erro}</p>}

        <FormField label="Senha provisória">
          <Input type="password" value={atual} autoComplete="current-password" className={inputClass}
            onChange={(event) => setAtual(event.target.value)} />
        </FormField>

        <FormField label="Nova senha" helperText="Mínimo 8 caracteres.">
          <Input type="password" value={nova} autoComplete="new-password" className={inputClass}
            onChange={(event) => setNova(event.target.value)} />
        </FormField>

        <FormField label="Confirme a nova senha">
          <Input type="password" value={confirmacao} autoComplete="new-password" className={inputClass}
            onChange={(event) => setConfirmacao(event.target.value)} />
        </FormField>

        <Button type="submit" disabled={salvando || !atual || !nova}
          className="h-[52px] w-full rounded-[8px] bg-[#18181B] text-lg font-normal text-white hover:bg-[#27272A]">
          {salvando ? "Salvando..." : "Salvar nova senha"}
        </Button>

        <button type="button" onClick={sair} className="w-full text-sm text-text-secondary underline-offset-4 hover:underline">
          Sair da conta
        </button>
      </form>
    </AccountShell>
  );
}
