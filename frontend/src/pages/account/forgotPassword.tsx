import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";

import { AccountShell } from "../../components/layout/accountShell";
import { Button } from "../../components/ui/button";
import { Captcha } from "../../components/ui/captcha";
import { FormField } from "../../components/ui/formField";
import { Input } from "../../components/ui/input";
import { errorMessage } from "../../lib/api";
import { captchaAtivo } from "../../lib/captcha";
import { requestPasswordReset } from "../../lib/services";

const inputClass = "h-[52px] rounded-[8px] border border-black bg-[#F4F4F5] px-[14px] text-base text-black";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [enviadoPara, setEnviadoPara] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaVersao, setCaptchaVersao] = useState(0);

  async function enviar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (enviando) return;
    const endereco = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(endereco)) return setErro("Digite um e-mail válido.");
    if (captchaAtivo && !captchaToken) return setErro("Confirme que você não é um robô.");
    setEnviando(true);
    setErro("");
    try {
      await requestPasswordReset(endereco, captchaToken);
      setEnviadoPara(endereco);
    } catch (caught) {
      setErro(errorMessage(caught));
    } finally {
      setEnviando(false);
      setCaptchaToken("");
      setCaptchaVersao((versao) => versao + 1);
    }
  }

  if (enviadoPara) {
    return (
      <AccountShell
        title="Confira seu e-mail"
        description={`Se existir uma conta com ${enviadoPara}, você vai receber um link para criar uma nova senha.`}
      >
        <ul className="space-y-2 text-sm text-text-secondary">
          <li>O link vale por 1 hora e só pode ser usado uma vez.</li>
          <li>Não chegou? Confira a caixa de spam e as promoções.</li>
        </ul>

        <div className="mt-8 space-y-3">
          <Link
            to="/"
            className="flex h-[52px] w-full items-center justify-center rounded-[8px] bg-[#18181B] text-lg text-white hover:bg-[#27272A]"
          >
            Voltar para o login
          </Link>
          <button
            type="button"
            onClick={() => setEnviadoPara("")}
            className="w-full text-sm text-text-secondary underline-offset-4 hover:underline"
          >
            Usar outro e-mail
          </button>
        </div>
      </AccountShell>
    );
  }

  return (
    <AccountShell
      title="Esqueceu a senha?"
      description="Digite o e-mail da sua conta. Vamos mandar um link para você criar uma nova senha."
    >
      <form onSubmit={enviar} className="space-y-4" noValidate>
        {erro && <p role="alert" className="text-sm text-red-700">{erro}</p>}

        <FormField label="E-mail">
          <Input
            type="email"
            value={email}
            autoComplete="email"
            placeholder="seu@email.com"
            className={inputClass}
            onChange={(event) => setEmail(event.target.value)}
          />
        </FormField>

        <Captcha key={`recuperar-${captchaVersao}`} onToken={setCaptchaToken} />

        <Button
          type="submit"
          disabled={enviando || !email.trim()}
          className="h-[52px] w-full rounded-[8px] bg-[#18181B] text-lg font-normal text-white hover:bg-[#27272A]"
        >
          {enviando ? "Enviando..." : "Enviar link"}
        </Button>

        <Link to="/" className="block text-center text-sm text-text-secondary underline-offset-4 hover:underline">
          Lembrei a senha, voltar para o login
        </Link>
      </form>
    </AccountShell>
  );
}
