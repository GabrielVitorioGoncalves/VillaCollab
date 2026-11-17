import { Request, Response, NextFunction } from 'express';
import { supabase } from '../config/supabase';

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      userEmail?: string;
      accessToken?: string;
      nivelAcesso?: 'aal1' | 'aal2';
      mfaCadastrado?: boolean;
      trocarSenha?: boolean;
    }
  }
}

const ROTAS_LIBERADAS_NA_TROCA_DE_SENHA = [
  /^GET \/api\/auth\/me$/,
  /^PATCH \/api\/auth\/senha$/,
  /^POST \/api\/auth\/senha\/redefinir$/,
  /^POST \/api\/auth\/logout$/,
  /^(GET|POST) \/api\/auth\/mfa(\/[a-z]+)?$/
];

function tokenDaRequisicao(req: Request): string | null {
  return /^Bearer ([^\s]+)$/i.exec(req.headers.authorization ?? '')?.[1] ?? null;
}

type PayloadDoToken = { aal?: string; amr?: { method?: string; timestamp?: number }[] };

export function payloadDoToken(token: string): PayloadDoToken {
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1] ?? '', 'base64url').toString('utf8'));
    return payload && typeof payload === 'object' ? payload : {};
  } catch {
    return {};
  }
}

export function nivelDoToken(token: string): 'aal1' | 'aal2' {
  return payloadDoToken(token).aal === 'aal2' ? 'aal2' : 'aal1';
}

async function identificar(req: Request, token: string): Promise<boolean> {
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return false;
  req.userId = data.user.id;
  req.userEmail = data.user.email ?? undefined;
  req.accessToken = token;
  req.nivelAcesso = nivelDoToken(token);
  req.mfaCadastrado = (data.user.factors ?? []).some(fator => fator.status === 'verified');
  req.trocarSenha = data.user.app_metadata?.trocar_senha === true;
  return true;
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const token = tokenDaRequisicao(req);
  if (!token) {
    return res.status(401).json({ erro: 'Token não fornecido ou malformado' });
  }
  if (!(await identificar(req, token))) {
    return res.status(401).json({ erro: 'Token inválido ou expirado' });
  }
  const rota = `${req.method} ${req.originalUrl.split('?')[0]}`;
  if (req.trocarSenha && !ROTAS_LIBERADAS_NA_TROCA_DE_SENHA.some(padrao => padrao.test(rota))) {
    return res.status(403).json({ erro: 'Defina uma nova senha para continuar', codigo: 'troca_de_senha' });
  }
  next();
}

export async function autenticacaoOpcional(req: Request, _res: Response, next: NextFunction) {
  const token = tokenDaRequisicao(req);
  if (token) await identificar(req, token).catch(() => false);
  next();
}

export function adminComMfa(req: Request): boolean {
  return req.nivelAcesso === 'aal2';
}
