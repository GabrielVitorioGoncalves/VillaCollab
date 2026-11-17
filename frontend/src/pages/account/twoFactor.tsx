import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";

import { AccountShell } from "../../components/layout/accountShell";
import { Button } from "../../components/ui/button";
import { FormField } from "../../components/ui/formField";
import { Input } from "../../components/ui/input";
import { RequestStatus } from "../../components/ui/requestStatus";
import { useRequest } from "../../hooks/useRequest";
import { errorMessage } from "../../lib/api";
import { getMfaStatus, logout, startMfaEnrollment, verifyMfa } from "../../lib/services";
import { getSession, nivelDaSessao, paginaInicial, saveSession } from "../../lib/session";
import type { MfaCadastro } from "../../types/api";

type Etapa = { modo: "codigo" } | { modo: "cadastro"; cadastro: MfaCadastro };

async function prepararEtapa(): Promise<Etapa> {
  const status = await getMfaStatus();
  if (status.cadastrado) return { modo: "codigo" };
  return { modo: "cadastro", cadastro: await startMfaEnrollment() };
}

function chaveEmGrupos(segredo: string) {
  return segredo.replace(/(.{4})/g, "$1 ").trim();
}

export function TwoFactorPage() {
  const navigate = useNavigate();
  const session = getSession();
  const pendente = !!session && !session.usuario?.trocar_senha && nivelDaSessao(session.token) !== "aal2";
  const etapa = useRequest(pendente ? "mfa-etapa" : null, prepararEtapa);
  const [codigo, setCodigo] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  if (!session) return <Navigate to="/" replace />;
  if (session.usuario?.trocar_senha) return <Navigate to="/conta/nova-senha" replace />;
  if (!pendente) return <Navigate to={paginaInicial(session.usuario?.role)} replace />;
  const sessaoAtual = session;

  const cadastro = etapa.data?.modo === "cadastro" ? etapa.data.cadastro : null;
  const qrCode = cadastro?.qr_code.startsWith("data:image/svg+xml") ? cadastro.qr_code : null;

  async function enviar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (enviando) return;
    if (!/^\d{6}$/.test(codigo)) return setErro("Digite os 6 números que aparecem no aplicativo.");
    setEnviando(true);
    setErro("");
    try {
      const nova = await verifyMfa(codigo, cadastro?.fator_id);
      saveSession({ ...sessaoAtual, token: nova.access_token, expiresAt: nova.expires_at ?? sessaoAtual.expiresAt });
      navigate(paginaInicial(sessaoAtual.usuario?.role), { replace: true });
    } catch (caught) {
      setErro(errorMessage(caught));
      setCodigo("");
      setEnviando(false);
    }
  }

  async function sair() {
    await logout();
    navigate("/", { replace: true });
  }

  return (
    <AccountShell
      title="Verificação em duas etapas"
      description={
        cadastro
          ? "Para proteger o painel, contas de administrador entram com senha e com um código do celular."
          : "Abra o aplicativo autenticador e digite o código de 6 números da Villa Collab."
      }
    >
      {!etapa.data ? (
        <RequestStatus loading={etapa.loading} error={etapa.error} onRetry={etapa.reload} loadingText="Preparando..." />
      ) : (
        <form onSubmit={enviar} className="space-y-5" noValidate>
          {cadastro && (
            <ol className="space-y-4 text-sm text-text">
              <li>
                <span className="font-medium">1.</span> Instale um aplicativo autenticador no celular, como Google
                Authenticator, Microsoft Authenticator ou Authy.
              </li>
              <li>
                <span className="font-medium">2.</span> No aplicativo, adicione uma conta lendo o QR code abaixo.
                {qrCode && (
                  <img src={qrCode} alt="QR code para o aplicativo autenticador"
                    className="mx-auto mt-3 h-44 w-44 rounded-lg border border-border bg-white p-2" />
                )}
                <span className="mt-3 block text-xs text-text-secondary">
                  Sem câmera? Digite esta chave no aplicativo:{" "}
                  <code className="break-all font-mono text-text">{chaveEmGrupos(cadastro.segredo)}</code>
                </span>
              </li>
              <li>
                <span className="font-medium">3.</span> Digite abaixo o código de 6 números que o aplicativo mostrar.
              </li>
            </ol>
          )}

          {erro && <p role="alert" className="text-sm text-red-700">{erro}</p>}

          <FormField label="Código do aplicativo">
            <Input
              value={codigo}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="000000"
              className="h-[52px] rounded-[8px] border border-black bg-[#F4F4F5] px-[14px] text-center text-xl tracking-[0.4em] text-black"
              onChange={(event) => setCodigo(event.target.value.replace(/\D/g, "").slice(0, 6))}
            />
          </FormField>

          <Button type="submit" disabled={enviando || codigo.length !== 6}
            className="h-[52px] w-full rounded-[8px] bg-[#18181B] text-lg font-normal text-white hover:bg-[#27272A]">
            {enviando ? "Conferindo..." : cadastro ? "Ativar e entrar" : "Entrar"}
          </Button>

          <button type="button" onClick={sair} className="w-full text-sm text-text-secondary underline-offset-4 hover:underline">
            Sair da conta
          </button>
        </form>
      )}
    </AccountShell>
  );
}
