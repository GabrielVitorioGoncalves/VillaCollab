import { Request, Response, NextFunction } from 'express';
import { supabase } from '../config/supabase';

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      userEmail?: string;
      accessToken?: string;
    }
  }
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const match = /^Bearer ([^\s]+)$/i.exec(req.headers.authorization ?? '');
  if (!match) {
    return res.status(401).json({ erro: 'Token não fornecido ou malformado' });
  }

  const token = match[1];
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    return res.status(401).json({ erro: 'Token inválido ou expirado' });
  }

  req.userId = data.user.id;
  req.userEmail = data.user.email ?? undefined;
  req.accessToken = token;
  next();
}
