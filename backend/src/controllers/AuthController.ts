import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { supabase, createSupabaseClient, updateAuthUser } from '../config/supabase';
import { rpcFailure } from '../errors/rpcFailure';
import { enderecoSchema } from '../schemas/catalogoSchema';

const registerSchema = z.object({
  nome: z.string().trim().min(2).max(255),
  email: z.email(),
  password: z.string().min(8).max(128)
}).strict();
const loginSchema = z.object({ email: z.email(), password: z.string().min(1) }).strict();

const profileSchema = z.object({
  nome: z.string().trim().min(2).max(255).optional(),
  telefone: z.string().trim().max(20).regex(/^[0-9()+\-\s]*$/, 'Telefone inválido').nullable().optional(),
  endereco: enderecoSchema.nullable().optional()
}).strict().refine(value => Object.keys(value).length > 0, 'Informe pelo menos um campo');

const emailSchema = z.object({ email: z.email() }).strict();
const passwordSchema = z.object({
  senha_atual: z.string().min(1),
  nova_senha: z.string().min(8).max(128)
}).strict();

const profileColumns = 'id, nome, role, loja_id, telefone, endereco';

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
        .select(profileColumns).eq('id', data.user.id).maybeSingle();
      if (perfilError || !perfil) {
        res.status(503).json({ erro: 'Perfil indisponível' });
        return;
      }
      res.json({ access_token: data.session.access_token,
        refresh_token: data.session.refresh_token, expires_at: data.session.expires_at,
        usuario: { ...perfil, email: data.user.email ?? email } });
    } catch (error) { next(error); }
  }

  async me(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { data, error } = await createSupabaseClient(req.accessToken).from('usuarios')
        .select(profileColumns).eq('id', req.userId!).maybeSingle();
      if (error) throw error;
      if (!data) { res.status(404).json({ erro: 'Perfil não encontrado' }); return; }
      res.json({ ...data, email: req.userEmail ?? null });
    } catch (error) { next(error); }
  }

  async updateMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = profileSchema.parse(req.body);
      const client = createSupabaseClient(req.accessToken);
      const { data: atual, error: readError } = await client.from('usuarios')
        .select('nome, telefone, endereco').eq('id', req.userId!).maybeSingle();
      if (readError) throw readError;
      if (!atual) { res.status(404).json({ erro: 'Perfil não encontrado' }); return; }

      const { error } = await client.rpc('atualizar_meu_perfil', {
        p_nome: input.nome ?? atual.nome,
        p_telefone: input.telefone !== undefined ? input.telefone : atual.telefone,
        p_endereco: input.endereco !== undefined ? input.endereco : atual.endereco
      });
      if (error) {
        if (rpcFailure(error, res, { INVALID: 'Dados inválidos', NOT_FOUND: 'Perfil não encontrado' })) return;
        throw error;
      }
      const { data, error: profileError } = await client.from('usuarios')
        .select(profileColumns).eq('id', req.userId!).maybeSingle();
      if (profileError || !data) throw profileError ?? new Error('Perfil indisponível');
      res.json({ ...data, email: req.userEmail ?? null });
    } catch (error) { next(error); }
  }

  async changeEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email } = emailSchema.parse(req.body);
      if (email.toLowerCase() === req.userEmail?.toLowerCase()) {
        res.status(400).json({ erro: 'Este já é o seu e-mail' }); return;
      }
      const result = await updateAuthUser(req.accessToken!, { email });
      if (!result.ok) {
        res.status(400).json({ erro: 'Não foi possível alterar o e-mail' }); return;
      }
      res.json({ confirmacao_email_pendente: true });
    } catch (error) { next(error); }
  }

  async changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { senha_atual, nova_senha } = passwordSchema.parse(req.body);
      if (!req.userEmail) { res.status(400).json({ erro: 'Conta sem e-mail' }); return; }
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: req.userEmail, password: senha_atual
      });
      if (loginError) { res.status(400).json({ erro: 'Senha atual incorreta' }); return; }
      const result = await updateAuthUser(req.accessToken!, { password: nova_senha });
      if (!result.ok) {
        res.status(400).json({ erro: 'Não foi possível alterar a senha' }); return;
      }
      res.status(204).end();
    } catch (error) { next(error); }
  }
}
