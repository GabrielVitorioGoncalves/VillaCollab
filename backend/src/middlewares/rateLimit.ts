import { Request, Response, NextFunction } from 'express';
import { isIP } from 'node:net';

type Options = {
  windowMs: number;
  max: number;
  key?: (req: Request) => string;
  message?: string;
};

type Entry = { count: number; reset: number };

const MAXIMO_DE_CHAVES = 50000;

export function clientIp(req: Request): string {
  const cloudflare = req.get('cf-connecting-ip')?.trim();
  if (cloudflare && isIP(cloudflare)) return cloudflare;
  return req.ip ?? req.socket.remoteAddress ?? 'desconhecido';
}

export function rateLimit({ windowMs, max, key, message }: Options) {
  const hits = new Map<string, Entry>();
  const cleanup = setInterval(() => {
    const now = Date.now();
    for (const [id, entry] of hits) if (entry.reset <= now) hits.delete(id);
  }, windowMs);
  cleanup.unref();

  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    const id = key ? key(req) : clientIp(req);
    let entry = hits.get(id);
    if (!entry || entry.reset <= now) {
      if (!entry && hits.size >= MAXIMO_DE_CHAVES) {
        const maisAntiga = hits.keys().next().value;
        if (maisAntiga !== undefined) hits.delete(maisAntiga);
      }
      entry = { count: 0, reset: now + windowMs };
      hits.set(id, entry);
    }
    entry.count += 1;
    if (entry.count > max) {
      res.setHeader('Retry-After', String(Math.max(1, Math.ceil((entry.reset - now) / 1000))));
      res.status(429).json({ erro: message ?? 'Muitas requisições. Aguarde um pouco e tente de novo.' });
      return;
    }
    next();
  };
}

const minuto = 60 * 1000;

function emailDoCorpo(req: Request): string {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  return email.slice(0, 320);
}

export const limiteGeral = rateLimit({ windowMs: 5 * minuto, max: 3000 });

export const limiteLoginIp = rateLimit({
  windowMs: 15 * minuto, max: 100,
  message: 'Muitas tentativas de login. Aguarde alguns minutos e tente de novo.'
});

export const limiteLoginConta = rateLimit({
  windowMs: 15 * minuto, max: 10,
  key: req => `${clientIp(req)}|${emailDoCorpo(req)}`,
  message: 'Muitas tentativas de login para esta conta. Aguarde alguns minutos e tente de novo.'
});

export const limiteLoginEmail = rateLimit({
  windowMs: 15 * minuto, max: 20,
  key: req => `login|${emailDoCorpo(req)}`,
  message: 'Muitas tentativas de login para esta conta. Aguarde alguns minutos e tente de novo.'
});

export const limiteCadastro = rateLimit({
  windowMs: 60 * minuto, max: 30,
  message: 'Muitos cadastros feitos desta rede. Tente de novo mais tarde.'
});

export const limiteRecuperacaoIp = rateLimit({
  windowMs: 60 * minuto, max: 20,
  message: 'Muitos pedidos de recuperação feitos desta rede. Tente de novo mais tarde.'
});

export const limiteRecuperacaoConta = rateLimit({
  windowMs: 60 * minuto, max: 5,
  key: req => `recuperacao|${emailDoCorpo(req)}`,
  message: 'Já enviamos alguns links para este e-mail. Confira a caixa de entrada e o spam, ou tente de novo mais tarde.'
});

export const limiteCredenciais = rateLimit({
  windowMs: 15 * minuto, max: 10,
  key: req => req.userId ?? clientIp(req),
  message: 'Muitas tentativas. Aguarde alguns minutos e tente de novo.'
});

export const limitePedidos = rateLimit({
  windowMs: 10 * minuto, max: 30,
  key: req => req.userId ?? clientIp(req),
  message: 'Muitos pedidos em pouco tempo. Aguarde alguns minutos e tente de novo.'
});

export const limiteEnvioImagem = rateLimit({
  windowMs: 10 * minuto, max: 60,
  key: req => req.userId ?? clientIp(req),
  message: 'Muitos envios de imagem em pouco tempo. Aguarde alguns minutos e tente de novo.'
});
