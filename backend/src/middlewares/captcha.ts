import { Request, Response, NextFunction } from 'express';
import { clientIp } from './rateLimit';

const VERIFICACAO = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export async function exigirCaptcha(req: Request, res: Response, next: NextFunction) {
  const resposta = typeof req.body?.captcha_token === 'string' ? req.body.captcha_token.slice(0, 2048) : '';
  if (req.body && typeof req.body === 'object') delete req.body.captcha_token;

  const segredo = process.env.TURNSTILE_SECRET_KEY;
  if (!segredo) { next(); return; }
  if (!resposta) {
    res.status(400).json({ erro: 'Confirme que você não é um robô e tente de novo.', codigo: 'captcha' });
    return;
  }

  try {
    const corpo = new URLSearchParams({ secret: segredo, response: resposta, remoteip: clientIp(req) });
    const verificacao = await fetch(VERIFICACAO, { method: 'POST', body: corpo, signal: AbortSignal.timeout(5000) });
    const resultado = await verificacao.json() as { success?: boolean };
    if (!resultado.success) {
      res.status(400).json({ erro: 'Confirme que você não é um robô e tente de novo.', codigo: 'captcha' });
      return;
    }
    next();
  } catch {
    res.status(503).json({ erro: 'Não foi possível verificar o captcha agora. Tente de novo em instantes.', codigo: 'captcha' });
  }
}
