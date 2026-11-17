import { useEffect, useEffectEvent, useRef, useState } from "react";

const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined;

export const captchaAtivo = Boolean(SITE_KEY);

interface Turnstile {
  render(elemento: HTMLElement, opcoes: Record<string, unknown>): string;
  remove(id: string): void;
}

declare global {
  interface Window {
    turnstile?: Turnstile;
  }
}

let carregamento: Promise<Turnstile> | null = null;

function carregarTurnstile(): Promise<Turnstile> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  carregamento ??= new Promise<Turnstile>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error("turnstile")));
    script.onerror = () => {
      carregamento = null;
      reject(new Error("turnstile"));
    };
    document.head.appendChild(script);
  });
  return carregamento;
}

interface CaptchaProps {
  onToken: (token: string) => void;
}

export function Captcha({ onToken }: CaptchaProps) {
  const container = useRef<HTMLDivElement>(null);
  const [falhou, setFalhou] = useState(false);
  const avisar = useEffectEvent((token: string) => onToken(token));

  useEffect(() => {
    if (!SITE_KEY) return;
    let ativo = true;
    let widget: string | null = null;
    carregarTurnstile().then(
      (turnstile) => {
        if (!ativo || !container.current) return;
        widget = turnstile.render(container.current, {
          sitekey: SITE_KEY,
          language: "pt-br",
          callback: (token: string) => avisar(token),
          "expired-callback": () => avisar(""),
          "error-callback": () => avisar(""),
        });
      },
      () => {
        if (ativo) setFalhou(true);
      }
    );
    return () => {
      ativo = false;
      if (widget && window.turnstile) window.turnstile.remove(widget);
    };
  }, []);

  if (!SITE_KEY) return null;

  return (
    <div className="mt-[16px]">
      <div ref={container} />
      {falhou && (
        <p className="mt-2 text-sm text-red-700">
          Não foi possível carregar a verificação anti-robô. Confira sua conexão e recarregue a página.
        </p>
      )}
    </div>
  );
}
