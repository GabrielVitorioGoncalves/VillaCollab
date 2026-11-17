import { useEffect, useState, type FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";

import { Button } from "../components/ui/button";
import { Captcha } from "../components/ui/captcha";
import { Card } from "../components/ui/card";
import { FormField } from "../components/ui/formField";
import { Input } from "../components/ui/input";
import { errorMessage } from "../lib/api";
import { captchaAtivo } from "../lib/captcha";
import { login, register } from "../lib/services";
import { paginaInicial, saveSession } from "../lib/session";

interface AuthLocationState {
  from?: string;
  expired?: boolean;
}

type AuthMode = "login" | "register";

interface LinkDoEmail {
  recuperacao?: string;
  aviso?: string;
  erro?: string;
}

function lerLinkDoEmail(): LinkDoEmail {
  const hash = window.location.hash;
  if (!hash) return {};
  const parametros = new URLSearchParams(hash.slice(1));
  if (parametros.get("type") === "recovery") return { recuperacao: hash };
  if (parametros.get("error") || parametros.get("error_code")) {
    return { erro: "Este link expirou ou já foi usado. Se era para trocar a senha, peça um novo em Esqueceu a senha?" };
  }
  if (parametros.get("type") === "email_change") return { aviso: "E-mail alterado. Entre usando o novo endereço." };
  if (parametros.get("type") === "signup") {
    return { aviso: "E-mail confirmado! Agora é só entrar." };
  }
  return {};
}

export function Auth() {
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = (location.state ?? {}) as AuthLocationState;
  const requestedPath =
    locationState.from?.startsWith("/user/") || locationState.from?.startsWith("/store/") ||
    locationState.from === "/admin" || locationState.from?.startsWith("/admin/")
      ? locationState.from
      : undefined;

  const [linkDoEmail] = useState(lerLinkDoEmail);
  const [mode, setMode] = useState<AuthMode>("login");
  const [error, setError] = useState(linkDoEmail.erro ?? "");
  const [notice, setNotice] = useState(
    linkDoEmail.aviso
      ? linkDoEmail.aviso
      : locationState.expired
        ? "Sua sessão expirou. Entre novamente para continuar."
        : locationState.from
          ? "Entre na sua conta para continuar."
          : ""
  );
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaVersao, setCaptchaVersao] = useState(0);

  useEffect(() => {
    if (window.location.hash && !linkDoEmail.recuperacao) {
      window.history.replaceState(window.history.state, "", window.location.pathname);
    }
  }, [linkDoEmail.recuperacao]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setNotice("");
    if (captchaAtivo && !captchaToken) {
      setError("Confirme que você não é um robô.");
      return;
    }
    setLoading(true);
    try {
      if (mode === "register") {
        const result = await register(name.trim(), email.trim(), password, captchaToken);
        setNotice(result.confirmacao_email_pendente
          ? "Conta criada! Confirme seu e-mail antes de entrar."
          : "Conta criada! Agora você pode entrar.");
        setMode("login");
        setPassword("");
      } else {
        const result = await login(email.trim(), password, captchaToken);
        if (!result?.access_token || !result.usuario?.nome) throw new Error("Resposta inválida da API.");
        saveSession({
          token: result.access_token,
          expiresAt: result.expires_at,
          email: email.trim(),
          usuario: result.usuario,
        });
        if (result.usuario.trocar_senha) {
          navigate("/conta/nova-senha", { replace: true });
        } else if (result.mfa?.necessario || result.mfa?.cadastro_necessario) {
          navigate("/conta/verificacao", { replace: true });
        } else {
          navigate(requestedPath ?? paginaInicial(result.usuario.role), { replace: true });
        }
      }
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setLoading(false);
      setCaptchaToken("");
      setCaptchaVersao((versao) => versao + 1);
    }
  };

  const changeMode = (newMode: AuthMode) => {
    setMode(newMode);
    setError("");
    setNotice("");
  };

  if (linkDoEmail.recuperacao) {
    return <Navigate to={{ pathname: "/redefinir-senha", hash: linkDoEmail.recuperacao }} replace />;
  }

  return (
    <main className="min-h-screen bg-[#F4F4F5]">
      {/* Header */}
      <header className="h-[70px] bg-white">
        <div className="flex h-full items-center px-6">
          <span className="text-2xl font-medium tracking-tight text-black">
            A Villa
          </span>
        </div>
      </header>

      {/* Conteúdo */}
      <div
        className={`
          flex justify-center px-4
          ${
            mode === "login"
              ? "items-start py-[64px]"
              : "items-start py-[40px]"
          }
        `}
      >
        <Card
          className={`
            w-full max-w-[552px]
            rounded-[32px]
            border border-[#A9A9A9]
            bg-white
            p-0
            shadow-[0px_4px_4px_rgba(0,0,0,0.25)]
          `}
        >
          {/* Abas */}
          <div className="px-[35px] pt-[39px]">
            <div className="relative flex h-[30px]">
              <button
                type="button"
                onClick={() => changeMode("login")}
                className={`
                  relative flex-1
                  text-2xl font-normal text-black
                `}
              >
                Entrar

                {mode === "login" && (
                  <span
                    className="
                      absolute bottom-[-1px]
                      left-0 right-0
                      h-px bg-black
                    "
                  />
                )}
              </button>

              <button
                type="button"
                onClick={() => changeMode("register")}
                className="
                  relative flex-1
                  text-2xl font-normal text-black
                "
              >
                Cadastrar

                {mode === "register" && (
                  <span
                    className="
                      absolute bottom-[-1px]
                      left-0 right-0
                      h-px bg-black
                    "
                  />
                )}
              </button>
            </div>
          </div>

          {/* Formulário */}
          <form
            onSubmit={handleSubmit}
            className={`
              px-[35px]
              ${mode === "login" ? "pb-[57px] pt-[61px]" : "pb-[61px] pt-[22px]"}
            `}
          >
            {error && <p role="alert" className="mb-4 text-sm text-red-700">{error}</p>}
            {notice && <p role="status" className="mb-4 text-sm text-green-700">{notice}</p>}
            {mode === "register" ? (
              /* =========================
                 CADASTRO
                 ========================= */
              <>
                <div className="space-y-[9px]">
                  <FormField label="Nome Completo">
                    <Input
                      type="text"
                      value={name}
                      onChange={(event) =>
                        setName(event.target.value)
                      }
                      placeholder="Ex: Maria"
                      className="
                        h-[52px]
                        rounded-[8px]
                        border border-black
                        bg-[#F4F4F5]
                        px-[14px]
                        text-base
                        text-black
                      "
                      required
                    />
                  </FormField>

                  <FormField label="Email">
                    <Input
                      type="email"
                      value={email}
                      onChange={(event) =>
                        setEmail(event.target.value)
                      }
                      placeholder="seu@email.com"
                      className="
                        h-[52px]
                        rounded-[8px]
                        border border-black
                        bg-[#F4F4F5]
                        px-[10px]
                        text-base
                        text-black
                      "
                      required
                    />
                  </FormField>
                </div>

                {/* Senha */}
                <div className="mt-[14px]">
                  <FormField label="Senha">
                    <Input
                      type="password"
                      value={password}
                      onChange={(event) =>
                        setPassword(event.target.value)
                      }
                      placeholder="Mínimo 8 caracteres"
                      minLength={8}
                      className="
                        h-[52px]
                        rounded-[8px]
                        border border-black
                        bg-[#F4F4F5]
                        px-[10px]
                        text-base
                        text-black
                      "
                      required
                    />
                  </FormField>
                </div>

                {/* Termos */}
                <label className="mt-[16px] flex cursor-pointer items-start gap-[12px]">
                  <input
                    type="checkbox"
                    required
                    className="
                      mt-[1px]
                      h-[17px] w-[18px]
                      shrink-0
                      appearance-none
                      bg-[#D9D9D9]
                      checked:bg-[#18181B]
                    "
                  />

                  <span className="text-[16px] leading-[19px] text-black">
                    Eu concordo com os{" "}
                    <Link to="/termos" target="_blank" rel="noreferrer" className="underline">
                      Termos de Uso
                    </Link>{" "}
                    e a{" "}
                    <Link to="/privacidade" target="_blank" rel="noreferrer" className="underline">
                      Política de Privacidade
                    </Link>
                    .
                  </span>
                </label>

                <Captcha key={`cadastro-${captchaVersao}`} onToken={setCaptchaToken} />

                {/* Criar conta */}
                <Button
                  type="submit"
                  disabled={loading}
                  className="
                    mt-[17px]
                    h-[52px]
                    w-full
                    rounded-[8px]
                    bg-[#18181B]
                    text-xl
                    font-normal
                    text-white
                    hover:bg-[#27272A]
                  "
                >
                  {loading ? "Aguarde..." : "Criar conta"}
                </Button>

              </>
            ) : (
              /* =========================
                 LOGIN
                 ========================= */
              <>
                {/* Email */}
                <FormField label="Email">
                  <Input
                    type="email"
                    value={email}
                    onChange={(event) =>
                      setEmail(event.target.value)
                    }
                    placeholder="seu@email.com"
                    className="
                      h-[52px]
                      rounded-[8px]
                      border border-black
                      bg-[#F4F4F5]
                      px-[26px]
                      text-base
                      text-black
                    "
                    required
                  />
                </FormField>

                {/* Senha */}
                <div className="mt-[18px]">
                  <FormField label="Senha">
                    <Input
                      type="password"
                      value={password}
                      onChange={(event) =>
                        setPassword(event.target.value)
                      }
                      className="
                        h-[52px]
                        rounded-[8px]
                        border border-black
                        bg-[#F4F4F5]
                        px-[26px]
                        text-base
                        text-black
                      "
                      required
                    />
                  </FormField>
                </div>

                {/* Esqueci a senha */}
                <div className="mt-[12px] flex justify-end">
                  <Link
                    to="/esqueci-senha"
                    className="
                      text-sm
                      text-[#71717A]
                      transition-colors
                      hover:text-black
                    "
                  >
                    Esqueceu a senha?
                  </Link>
                </div>

                <Captcha key={`login-${captchaVersao}`} onToken={setCaptchaToken} />

                {/* Entrar */}
                <Button
                  type="submit"
                  disabled={loading}
                  className="
                    mt-[8px]
                    h-[52px]
                    w-full
                    rounded-[8px]
                    bg-[#18181B]
                    text-xl
                    font-normal
                    text-white
                    hover:bg-[#27272A]
                  "
                >
                  {loading ? "Aguarde..." : "Entrar na conta"}
                </Button>

              </>
            )}
          </form>
        </Card>
      </div>
    </main>
  );
}
