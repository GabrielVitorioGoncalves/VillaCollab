import { useState, type FormEvent } from "react";

import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { FormField } from "../components/ui/formField";
import { Input } from "../components/ui/input";

const googleIcon =
  "https://www.figma.com/api/mcp/asset/cb8cd5ed-87ad-4a85-abd7-31963323bf3f.png";

type AuthMode = "login" | "register";

interface AuthProps {
  onLogin?: (email: string, password: string) => void;
  onRegister?: (
    name: string,
    email: string,
    password: string
  ) => void;
  onForgotPassword?: () => void;
  onGoogleLogin?: () => void;
}

export function Auth({
  onLogin,
  onRegister,
  onForgotPassword,
  onGoogleLogin,
}: AuthProps) {
  const [mode, setMode] = useState<AuthMode>("login");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (mode === "login") {
      onLogin?.(email, password);
      return;
    }

    onRegister?.(name, email, password);
  };

  const changeMode = (newMode: AuthMode) => {
    setMode(newMode);
  };

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
            ${
              mode === "login"
                ? "min-h-[596px]"
                : "min-h-[704px]"
            }
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
                      placeholder="Ex: Jô Soares"
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
                    <button
                      type="button"
                      className="underline"
                      onClick={(event) =>
                        event.preventDefault()
                      }
                    >
                      Termos de Serviço
                    </button>{" "}
                    e a{" "}
                    <button
                      type="button"
                      className="underline"
                      onClick={(event) =>
                        event.preventDefault()
                      }
                    >
                      Política de Privacidade
                    </button>
                    .
                  </span>
                </label>

                {/* Criar conta */}
                <Button
                  type="submit"
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
                  Criar conta
                </Button>

                {/* Divisor */}
                <div className="my-[34px] flex items-center gap-3">
                  <div className="h-px flex-1 bg-[#A9A9A9]" />

                  <span className="shrink-0 text-sm text-[#A9A9A9]">
                    Ou cadastre-se com
                  </span>

                  <div className="h-px flex-1 bg-[#A9A9A9]" />
                </div>

                {/* Google */}
                <Button
                  type="button"
                  variant="outline"
                  onClick={onGoogleLogin}
                  className="
                    h-[53px]
                    w-full
                    rounded-none
                    border border-[#A9A9A9]
                    bg-transparent
                    text-xl
                    font-bold
                    text-black
                    hover:bg-white
                  "
                >
                  <img
                    src={googleIcon}
                    alt=""
                    className="h-6 w-6 object-cover"
                  />

                  Google
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
                  <button
                    type="button"
                    onClick={onForgotPassword}
                    className="
                      text-sm
                      text-[#A9A9A9]
                      transition-colors
                      hover:text-black
                    "
                  >
                    Esqueceu a Senha?
                  </button>
                </div>

                {/* Entrar */}
                <Button
                  type="submit"
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
                  Entrar na conta
                </Button>

                {/* Divisor */}
                <div className="my-[34px] flex items-center gap-3">
                  <div className="h-px flex-1 bg-[#A9A9A9]" />

                  <span className="shrink-0 text-sm text-[#A9A9A9]">
                    ou continue com
                  </span>

                  <div className="h-px flex-1 bg-[#A9A9A9]" />
                </div>

                {/* Google */}
                <Button
                  type="button"
                  variant="outline"
                  onClick={onGoogleLogin}
                  className="
                    h-[53px]
                    w-full
                    rounded-none
                    border border-[#A9A9A9]
                    bg-transparent
                    text-xl
                    font-bold
                    text-black
                    hover:bg-white
                  "
                >
                  <img
                    src={googleIcon}
                    alt=""
                    className="h-6 w-6 object-cover"
                  />

                  Google
                </Button>
              </>
            )}
          </form>
        </Card>
      </div>
    </main>
  );
}