import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";

import { AccountShell } from "../../components/layout/accountShell";
import { Button } from "../../components/ui/button";
import { FormField } from "../../components/ui/formField";
import { Input } from "../../components/ui/input";
import { ApiError, errorMessage } from "../../lib/api";
import { resetPassword } from "../../lib/services";
import { clearSession } from "../../lib/session";

const inputClass = "h-[52px] rounded-[8px] border border-black bg-[#F4F4F5] px-[14px] text-base text-black";

function tokenDoLink(): string | null {
  const parametros = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const token = parametros.get("access_token");
  const tipo = parametros.get("type");
  if (parametros.get("error") || !token || tipo !== "recovery") return null;
  return token;
}

const linkClass =
  "flex h-[52px] w-full items-center justify-center rounded-[8px] bg-[#18181B] text-lg text-white hover:bg-[#27272A]";

export function ResetPasswordPage() {
  const [token] = useState(tokenDoLink);
  const [nova, setNova] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [codigo, setCodigo] = useState("");
  const [pedeCodigo, setPedeCodigo] = useState(false);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [pronto, setPronto] = useState(false);
  const [linkVencido, setLinkVencido] = useState(false);

  useEffect(() => {
    if (window.location.hash) {
      window.history.replaceState(window.history.state, "", window.location.pathname);
    }
  }, []);

  if (!token || linkVencido) {
    return (
      <AccountShell
        title="Link inválido"
        description="Este link de recuperação expirou ou já foi usado. Peça um novo para criar sua senha."
      >
        <Link to="/esqueci-senha" className={linkClass}>
          Pedir novo link
        </Link>
        <Link to="/" className="mt-3 block text-center text-sm text-text-secondary underline-offset-4 hover:underline">
          Voltar para o login
        </Link>
      </AccountShell>
    );
  }

  if (pronto) {
    return (
      <AccountShell
        title="Senha alterada"
        description="Sua nova senha já está valendo. Por segurança, saímos da sua conta em todos os aparelhos."
      >
        <Link to="/" className={linkClass}>
          Entrar com a nova senha
        </Link>
      </AccountShell>
    );
  }

  async function enviar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (salvando || !token) return;
    if (nova.length < 8) return setErro("A nova senha precisa ter pelo menos 8 caracteres.");
    if (nova !== confirmacao) return setErro("A confirmação não é igual à nova senha.");
    if (pedeCodigo && !/^\d{6}$/.test(codigo)) return setErro("Digite os 6 números que aparecem no aplicativo.");
    setSalvando(true);
    setErro("");
    try {
      await resetPassword(token, nova, pedeCodigo ? codigo : undefined);
      clearSession();
      setPronto(true);
    } catch (caught) {
      if (caught instanceof ApiError && caught.codigo === "mfa_codigo") {
        setPedeCodigo(true);
      } else if (caught instanceof ApiError && (caught.status === 401 || caught.status === 403)) {
        setLinkVencido(true);
      } else {
        setErro(errorMessage(caught));
        setCodigo("");
      }
    } finally {
      setSalvando(false);
    }
  }

  return (
    <AccountShell
      title="Crie uma nova senha"
      description="Escolha uma senha que você não use em outros sites."
    >
      <form onSubmit={enviar} className="space-y-4" noValidate>
        {erro && <p role="alert" className="text-sm text-red-700">{erro}</p>}

        <FormField label="Nova senha" helperText="Mínimo 8 caracteres.">
          <Input type="password" value={nova} autoComplete="new-password" className={inputClass}
            onChange={(event) => setNova(event.target.value)} />
        </FormField>

        <FormField label="Confirme a nova senha">
          <Input type="password" value={confirmacao} autoComplete="new-password" className={inputClass}
            onChange={(event) => setConfirmacao(event.target.value)} />
        </FormField>

        {pedeCodigo && (
          <FormField
            label="Código do aplicativo autenticador"
            helperText="Sua conta usa verificação em duas etapas. Abra o aplicativo e digite o código de 6 números."
          >
            <Input
              value={codigo}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="000000"
              className={`${inputClass} tracking-[0.3em]`}
              onChange={(event) => setCodigo(event.target.value.replace(/\D/g, ""))}
            />
          </FormField>
        )}

        <Button type="submit" disabled={salvando || !nova || !confirmacao}
          className="h-[52px] w-full rounded-[8px] bg-[#18181B] text-lg font-normal text-white hover:bg-[#27272A]">
          {salvando ? "Salvando..." : "Salvar nova senha"}
        </Button>
      </form>
    </AccountShell>
  );
}
