import { Request, Response, NextFunction } from 'express';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { createServiceClient, createSupabaseClient, requisicaoAuth, signOutSession, updateAuthUser } from '../config/supabase';
import { origemConfiavel } from '../config/origens';
import { rpcFailure } from '../errors/rpcFailure';
import { payloadDoToken } from '../middlewares/authMiddleware';
import { enderecoSchema } from '../schemas/catalogoSchema';

const registerSchema = z.object({
  nome: z.string().trim().min(2).max(255),
  email: z.email(),
  password: z.string().min(8).max(128)
}).strict();
const loginSchema = z.object({ email: z.email(), password: z.string().min(1).max(128) }).strict();

const profileSchema = z.object({
  nome: z.string().trim().min(2).max(255).optional(),
  telefone: z.string().trim().max(20).regex(/^[0-9()+\-\s]*$/, 'Telefone inválido').nullable().optional(),
  endereco: enderecoSchema.nullable().optional()
}).strict().refine(value => Object.keys(value).length > 0, 'Informe pelo menos um campo');

const emailSchema = z.object({ email: z.email(), senha_atual: z.string().min(1).max(128) }).strict();
const passwordSchema = z.object({
  senha_atual: z.string().min(1).max(128),
  nova_senha: z.string().min(8).max(128)
}).strict();

const excluirContaSchema = z.object({ senha_atual: z.string().min(1).max(128) }).strict();
const codigoMfaSchema = z.object({
  fator_id: z.uuid().optional(),
  codigo: z.string().trim().regex(/^\d{6}$/, 'Digite os 6 números do aplicativo')
}).strict();

const recuperarSenhaSchema = z.object({ email: z.email() }).strict();
const redefinirSenhaSchema = z.object({
  nova_senha: z.string().min(8).max(128),
  codigo: z.string().trim().regex(/^\d{6}$/, 'Digite os 6 números do aplicativo').optional()
}).strict();

const METODOS_DO_LINK_POR_EMAIL = new Set(['otp', 'recovery', 'magiclink']);
const VALIDADE_DO_LINK_EM_SEGUNDOS = 60 * 60;

const profileColumns = 'id, nome, role, loja_id, telefone, endereco';

type Fator = { id: string; factor_type: string; status: string };
type SessaoAuth = { access_token?: string; refresh_token?: string; expires_at?: number };

async function fatoresDoUsuario(accessToken: string): Promise<Fator[]> {
  const resposta = await requisicaoAuth(accessToken, 'GET', '/user');
  if (!resposta.ok) throw new Error('Não foi possível consultar a verificação em duas etapas');
  const fatores = (resposta.dados as { factors?: Fator[] } | null)?.factors ?? [];
  return fatores.filter(fator => fator.factor_type === 'totp');
}

async function validarCodigoMfa(accessToken: string, fatorId: string, codigo: string):
  Promise<{ sessao: SessaoAuth } | { status: number; erro: string }> {
  const desafio = await requisicaoAuth(accessToken, 'POST', `/factors/${fatorId}/challenge`, {});
  const desafioId = (desafio.dados as { id?: string } | null)?.id;
  if (!desafio.ok || !desafioId) return { status: 502, erro: 'Não foi possível validar o código agora' };
  const verificacao = await requisicaoAuth(accessToken, 'POST', `/factors/${fatorId}/verify`, {
    challenge_id: desafioId, code: codigo
  });
  const sessao = verificacao.dados as SessaoAuth | null;
  if (!verificacao.ok || !sessao?.access_token) {
    return { status: 400, erro: 'Código inválido. Confira se o horário do celular está certo e tente de novo.' };
  }
  return { sessao };
}

function veioDoLinkPorEmail(accessToken: string): boolean {
  const agora = Math.floor(Date.now() / 1000);
  return (payloadDoToken(accessToken).amr ?? []).some(item =>
    METODOS_DO_LINK_POR_EMAIL.has(item.method ?? '')
    && typeof item.timestamp === 'number'
    && agora - item.timestamp <= VALIDADE_DO_LINK_EM_SEGUNDOS);
}

async function confirmPassword(email: string, password: string): Promise<boolean> {
  const { data, error } = await createSupabaseClient().auth.signInWithPassword({ email, password });
  if (error || !data.session) return false;
  await signOutSession(data.session.access_token, 'local').catch(() => undefined);
  return true;
}

export class AuthController {
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { nome, email, password } = registerSchema.parse(req.body);
      const { data, error } = await createSupabaseClient().auth.signUp({
        email, password, options: { data: { nome } }
      });
      if (error || !data.user) {
        res.status(400).json({ erro: 'Não foi possível cadastrar o usuário' });
        return;
      }
      if (data.session) await signOutSession(data.session.access_token, 'local').catch(() => undefined);
      // O trigger do banco cria o perfil cliente, mesmo quando confirmação de email está ativa.
      res.status(201).json({ id: data.user.id, confirmacao_email_pendente: !data.session });
    } catch (error) { next(error); }
  }

  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = loginSchema.parse(req.body);
      const { data, error } = await createSupabaseClient().auth.signInWithPassword({ email, password });
      if (error?.code === 'email_not_confirmed') {
        res.status(403).json({ erro: 'Confirme seu e-mail antes de entrar. O link foi enviado para a sua caixa de entrada.' });
        return;
      }
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
      const mfaCadastrado = (data.user.factors ?? []).some(fator => fator.status === 'verified');
      res.json({ access_token: data.session.access_token,
        refresh_token: data.session.refresh_token, expires_at: data.session.expires_at,
        usuario: { ...perfil, email: data.user.email ?? email, trocar_senha: data.user.app_metadata?.trocar_senha === true },
        mfa: { necessario: mfaCadastrado, cadastro_necessario: perfil.role === 'admin' && !mfaCadastrado } });
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
      const { email, senha_atual } = emailSchema.parse(req.body);
      if (!req.userEmail) { res.status(400).json({ erro: 'Conta sem e-mail' }); return; }
      if (email.toLowerCase() === req.userEmail.toLowerCase()) {
        res.status(400).json({ erro: 'Este já é o seu e-mail' }); return;
      }
      if (!(await confirmPassword(req.userEmail, senha_atual))) {
        res.status(400).json({ erro: 'Senha atual incorreta' }); return;
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
      if (!(await confirmPassword(req.userEmail, senha_atual))) {
        res.status(400).json({ erro: 'Senha atual incorreta' }); return;
      }
      const result = await updateAuthUser(req.accessToken!, { password: nova_senha });
      if (!result.ok) {
        res.status(400).json({ erro: result.status === 422
          ? 'A nova senha precisa ser diferente da atual'
          : 'Não foi possível alterar a senha' });
        return;
      }
      await signOutSession(req.accessToken!, 'others').catch(() => undefined);
      if (req.trocarSenha) {
        const service = createServiceClient();
        const { error } = service
          ? await service.auth.admin.updateUserById(req.userId!, { app_metadata: { trocar_senha: false } })
          : { error: new Error('sem chave de serviço') };
        if (error) { res.status(503).json({ erro: 'A senha foi trocada, mas não foi possível liberar a conta. Tente entrar de novo.' }); return; }
      }
      res.status(204).end();
    } catch (error) { next(error); }
  }

  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await signOutSession(req.accessToken!, 'local');
      res.status(204).end();
    } catch (error) { next(error); }
  }

  async mfaStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const fatores = await fatoresDoUsuario(req.accessToken!);
      res.json({
        nivel: req.nivelAcesso ?? 'aal1',
        cadastrado: fatores.some(fator => fator.status === 'verified')
      });
    } catch (error) { next(error); }
  }

  async mfaCadastro(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const fatores = await fatoresDoUsuario(req.accessToken!);
      if (fatores.some(fator => fator.status === 'verified')) {
        res.status(409).json({ erro: 'A verificação em duas etapas já está ativa nesta conta' }); return;
      }
      for (const fator of fatores) {
        await requisicaoAuth(req.accessToken!, 'DELETE', `/factors/${fator.id}`);
      }
      const resposta = await requisicaoAuth(req.accessToken!, 'POST', '/factors', {
        factor_type: 'totp', friendly_name: `Villa Collab ${Date.now()}`, issuer: 'Villa Collab'
      });
      const dados = resposta.dados as { id?: string; totp?: { qr_code?: string; secret?: string } } | null;
      if (!resposta.ok || !dados?.id || !dados.totp?.qr_code || !dados.totp.secret) {
        res.status(502).json({ erro: 'Não foi possível iniciar a verificação em duas etapas' }); return;
      }
      const qrCode = dados.totp.qr_code.startsWith('data:')
        ? dados.totp.qr_code
        : `data:image/svg+xml;utf-8,${encodeURIComponent(dados.totp.qr_code)}`;
      res.status(201).json({ fator_id: dados.id, qr_code: qrCode, segredo: dados.totp.secret });
    } catch (error) { next(error); }
  }

  async mfaVerificar(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { fator_id, codigo } = codigoMfaSchema.parse(req.body);
      const fatores = await fatoresDoUsuario(req.accessToken!);
      const fator = fator_id
        ? fatores.find(item => item.id === fator_id)
        : fatores.find(item => item.status === 'verified');
      if (!fator) { res.status(404).json({ erro: 'Verificação em duas etapas não encontrada' }); return; }
      const resultado = await validarCodigoMfa(req.accessToken!, fator.id, codigo);
      if ('erro' in resultado) { res.status(resultado.status).json({ erro: resultado.erro }); return; }
      const { sessao } = resultado;
      res.json({ access_token: sessao.access_token, refresh_token: sessao.refresh_token, expires_at: sessao.expires_at });
    } catch (error) { next(error); }
  }

  async recuperarSenha(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email } = recuperarSenhaSchema.parse(req.body);
      const origem = origemConfiavel(req.get('origin'));
      const { error } = await createSupabaseClient().auth.resetPasswordForEmail(email,
        origem ? { redirectTo: `${origem}/redefinir-senha` } : undefined);
      if (error && (error.status ?? 500) >= 500) {
        res.status(503).json({ erro: 'Não foi possível enviar o e-mail agora. Tente de novo em alguns minutos.' });
        return;
      }
      res.status(202).json({
        mensagem: 'Se existir uma conta com este e-mail, enviamos um link para criar uma nova senha.'
      });
    } catch (error) { next(error); }
  }

  async redefinirSenha(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { nova_senha, codigo } = redefinirSenhaSchema.parse(req.body);
      if (!veioDoLinkPorEmail(req.accessToken!)) {
        res.status(403).json({ erro: 'Este link não vale mais. Peça um novo link de recuperação.' }); return;
      }
      let token = req.accessToken!;
      if (req.mfaCadastrado && req.nivelAcesso !== 'aal2') {
        if (!codigo) {
          res.status(403).json({ erro: 'Digite o código do aplicativo autenticador para continuar.', codigo: 'mfa_codigo' });
          return;
        }
        const fator = (await fatoresDoUsuario(token)).find(item => item.status === 'verified');
        if (!fator) { res.status(404).json({ erro: 'Verificação em duas etapas não encontrada' }); return; }
        const resultado = await validarCodigoMfa(token, fator.id, codigo);
        if ('erro' in resultado) { res.status(resultado.status).json({ erro: resultado.erro }); return; }
        token = resultado.sessao.access_token!;
      }
      const result = await updateAuthUser(token, { password: nova_senha });
      if (!result.ok) {
        res.status(400).json({ erro: result.status === 422
          ? 'A nova senha precisa ser diferente da anterior'
          : 'Não foi possível alterar a senha. Peça um novo link e tente de novo.' });
        return;
      }
      if (req.trocarSenha) {
        const service = createServiceClient();
        if (service) await service.auth.admin.updateUserById(req.userId!, { app_metadata: { trocar_senha: false } });
      }
      await signOutSession(token, 'global').catch(() => undefined);
      res.status(204).end();
    } catch (error) { next(error); }
  }

  async excluirConta(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { senha_atual } = excluirContaSchema.parse(req.body);
      if (!req.userEmail) { res.status(400).json({ erro: 'Conta sem e-mail' }); return; }
      const service = createServiceClient();
      if (!service) { res.status(503).json({ erro: 'A exclusão de conta está indisponível no momento' }); return; }
      if (!(await confirmPassword(req.userEmail, senha_atual))) {
        res.status(400).json({ erro: 'Senha atual incorreta' }); return;
      }
      const { data: tinhaPedidos, error } = await createSupabaseClient(req.accessToken).rpc('anonimizar_minha_conta');
      if (error) {
        if (/^VC_FORBIDDEN: admin/.test(error.message)) {
          res.status(403).json({ erro: 'Contas de administrador são removidas por outro administrador' }); return;
        }
        if (/^VC_FORBIDDEN: lojista/.test(error.message)) {
          res.status(403).json({ erro: 'Contas de lojista são encerradas pela administração da plataforma. Fale com o suporte.' }); return;
        }
        if (rpcFailure(error, res, {
          CONFLICT: 'Você tem pedidos em andamento. Aguarde a entrega ou cancele os pedidos antes de excluir a conta.'
        })) return;
        throw error;
      }
      const resultado = tinhaPedidos
        ? await service.auth.admin.updateUserById(req.userId!, {
          email: `removido.${req.userId}@conta-removida.invalid`,
          password: randomBytes(32).toString('hex'),
          email_confirm: true,
          ban_duration: '876000h',
          user_metadata: {}
        })
        : await service.auth.admin.deleteUser(req.userId!);
      if (resultado.error) throw new Error('Falha ao remover o acesso da conta');
      res.status(204).end();
    } catch (error) { next(error); }
  }
}
