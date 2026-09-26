import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { supabase, createSupabaseClient } from '../config/supabase';

const registerSchema = z.object({
  nome: z.string().trim().min(2).max(255),
  email: z.email(),
  password: z.string().min(8).max(128)
}).strict();
const loginSchema = z.object({ email: z.email(), password: z.string().min(1) }).strict();

export class AuthController {
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { nome, email, password } = registerSchema.parse(req.body);
      const { data, error } = await supabase.auth.signUp({
        email, password, options: { data: { nome } }
      });
      if (error || !data.user) {
        res.status(400).json({ erro: 'Não foi possível cadastrar o usuário' });
        return;
      }
      // O trigger do banco cria o perfil cliente, mesmo quando confirmação de email está ativa.
      res.status(201).json({ id: data.user.id, confirmacao_email_pendente: !data.session });
    } catch (error) { next(error); }
  }

  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = loginSchema.parse(req.body);
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error || !data.session || !data.user) {
        res.status(401).json({ erro: 'Credenciais inválidas' });
        return;
      }
      const client = createSupabaseClient(data.session.access_token);
      const { data: perfil, error: perfilError } = await client.from('usuarios')
        .select('id, nome, role, loja_id').eq('id', data.user.id).maybeSingle();
      if (perfilError || !perfil) {
        res.status(503).json({ erro: 'Perfil indisponível' });
        return;
      }
      res.json({ access_token: data.session.access_token,
        refresh_token: data.session.refresh_token, expires_at: data.session.expires_at,
        usuario: perfil });
    } catch (error) { next(error); }
  }

  async me(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { data, error } = await createSupabaseClient(req.accessToken).from('usuarios')
        .select('id, nome, role, loja_id').eq('id', req.userId!).maybeSingle();
      if (error) throw error;
      if (!data) { res.status(404).json({ erro: 'Perfil não encontrado' }); return; }
      res.json(data);
    } catch (error) { next(error); }
  }
}
