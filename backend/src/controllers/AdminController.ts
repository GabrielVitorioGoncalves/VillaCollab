import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { createServiceClient, createSupabaseClient } from '../config/supabase';
import { rpcFailure } from '../errors/rpcFailure';
import { enviarImagemDaLoja } from '../services/ImagemLojaService';
import {
  PERMISSOES_ADMIN,
  PermissaoAdmin,
  atualizarLojaSchema,
  criarAdminSchema,
  criarLojaSchema,
  papelSchema,
  permissoesDoTipo
} from '../schemas/adminSchema';

const idParams = z.object({ id: z.uuid() });
const imageQuery = z.object({ tipo: z.enum(['logo', 'banner']) });

type Client = ReturnType<typeof createSupabaseClient>;
type ServiceClient = NonNullable<ReturnType<typeof createServiceClient>>;
type RpcError = { message: string; code?: string };

interface LojaAdmin {
  id: string;
  responsavel_id: string | null;
  responsavel_email: string | null;
  [key: string]: unknown;
}

interface Ator {
  client: Client;
  permissoes: PermissaoAdmin[];
}

const SEM_CHAVE_DE_SERVICO = 'Cadastro e exclusão de contas indisponíveis: o servidor não tem a chave de serviço do Supabase configurada';

async function ator(req: Request, res: Response, permissao?: PermissaoAdmin): Promise<Ator | null> {
  const client = createSupabaseClient(req.accessToken);
  const { data, error } = await client.from('usuarios')
    .select('role, admin_permissoes').eq('id', req.userId!).maybeSingle();
  if (error) throw error;
  if (data?.role !== 'admin') {
    res.status(403).json({ erro: 'Acesso restrito a administradores' });
    return null;
  }
  const permissoes = (data.admin_permissoes as PermissaoAdmin[] | null) ?? [...PERMISSOES_ADMIN];
  if (permissao && !permissoes.includes(permissao)) {
    res.status(403).json({ erro: 'Sua conta não tem permissão para esta área' });
    return null;
  }
  return { client, permissoes };
}

function servico(res: Response): ServiceClient | null {
  const service = createServiceClient();
  if (!service) res.status(503).json({ erro: SEM_CHAVE_DE_SERVICO });
  return service;
}

function detalhe(error: RpcError, palavra: string): boolean {
  return new RegExp(`^VC_[A-Z_]+:\\s*${palavra}`).test(error.message);
}

function falhaDePapel(error: RpcError, res: Response): boolean {
  if (detalhe(error, 'proprio')) {
    res.status(403).json({ erro: 'Você não pode alterar o seu próprio papel' }); return true;
  }
  if (detalhe(error, 'superior')) {
    res.status(403).json({ erro: 'Você não pode dar, alterar ou remover permissões que a sua conta não tem' }); return true;
  }
  if (detalhe(error, 'loja')) {
    res.status(400).json({ erro: 'Escolha uma loja existente para o lojista' }); return true;
  }
  if (detalhe(error, 'permissoes')) {
    res.status(400).json({ erro: 'Escolha o tipo e pelo menos uma permissão do administrador' }); return true;
  }
  return rpcFailure(error, res, { NOT_FOUND: 'Usuário não encontrado', INVALID: 'Dados inválidos' });
}

function falhaDeLoja(error: RpcError, res: Response): boolean {
  if (detalhe(error, 'cnpj')) {
    res.status(409).json({ erro: 'Já existe uma loja com este CNPJ' }); return true;
  }
  if (detalhe(error, 'responsavel')) {
    res.status(409).json({ erro: 'Esta conta já é administradora ou responsável por outra loja' }); return true;
  }
  if (detalhe(error, 'pedidos')) {
    res.status(409).json({ erro: 'A loja tem pedidos e não pode ser excluída. Desative a loja para tirá-la do marketplace.' });
    return true;
  }
  return rpcFailure(error, res, { NOT_FOUND: 'Loja não encontrada' });
}

function falhaDeConta(error: { message: string; status?: number; code?: string }, res: Response) {
  if (error.code === 'email_exists' || error.status === 422 && /already|registered|exists/i.test(error.message)) {
    res.status(409).json({ erro: 'Já existe uma conta com este e-mail' }); return;
  }
  if (error.code === 'weak_password') {
    res.status(400).json({ erro: 'Senha fraca: use letras e números, com pelo menos 8 caracteres' }); return;
  }
  if (error.status === 400 || error.status === 422) {
    res.status(400).json({ erro: 'Não foi possível criar a conta com esses dados' }); return;
  }
  throw new Error('Falha ao criar conta');
}

async function criarConta(service: ServiceClient, email: string, senha: string, nome: string) {
  return service.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
    user_metadata: { nome }
  });
}

async function listarLojas(client: Client): Promise<LojaAdmin[]> {
  const { data, error } = await client.rpc('admin_listar_lojas');
  if (error) throw error;
  return (data ?? []) as LojaAdmin[];
}

async function cnpjEmUso(client: Client, cnpj: string, ignorar?: string): Promise<boolean> {
  let consulta = client.from('lojas').select('id').eq('cnpj', cnpj);
  if (ignorar) consulta = consulta.neq('id', ignorar);
  const { data, error } = await consulta.limit(1);
  if (error) throw error;
  return (data ?? []).length > 0;
}

export class AdminController {
  async me(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = await ator(req, res); if (!ctx) return;
      const { data, error } = await ctx.client.from('usuarios')
        .select('id, nome, admin_tipo').eq('id', req.userId!).maybeSingle();
      if (error) throw error;
      res.json({ ...data, email: req.userEmail ?? null, admin_tipo: data?.admin_tipo ?? 'Admin', permissoes: ctx.permissoes });
    } catch (error) { next(error); }
  }

  async painel(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = await ator(req, res, 'relatorios'); if (!ctx) return;
      const { data, error } = await ctx.client.rpc('admin_painel');
      if (error) {
        if (rpcFailure(error, res)) return;
        throw error;
      }
      res.json(data);
    } catch (error) { next(error); }
  }

  async lojas(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = await ator(req, res, 'lojas'); if (!ctx) return;
      res.json(await listarLojas(ctx.client));
    } catch (error) { next(error); }
  }

  async loja(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = idParams.parse(req.params);
      const ctx = await ator(req, res, 'lojas'); if (!ctx) return;
      const loja = (await listarLojas(ctx.client)).find(item => item.id === id);
      if (!loja) { res.status(404).json({ erro: 'Loja não encontrada' }); return; }
      res.json(loja);
    } catch (error) { next(error); }
  }

  async criarLoja(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = criarLojaSchema.parse(req.body);
      const ctx = await ator(req, res, 'lojas'); if (!ctx) return;
      const service = servico(res); if (!service) return;
      if (await cnpjEmUso(ctx.client, input.cnpj)) {
        res.status(409).json({ erro: 'Já existe uma loja com este CNPJ' }); return;
      }

      const conta = await criarConta(service, input.email, input.senha, input.nome);
      if (conta.error || !conta.data.user) { falhaDeConta(conta.error ?? { message: '' }, res); return; }
      const usuarioId = conta.data.user.id;

      const { data: lojaId, error } = await ctx.client.rpc('admin_criar_loja', {
        p_nome: input.nome, p_cnpj: input.cnpj, p_telefone: input.telefone,
        p_categoria: input.categoria, p_responsavel: usuarioId
      });
      if (error) {
        await service.auth.admin.deleteUser(usuarioId);
        if (falhaDeLoja(error, res)) return;
        throw error;
      }
      const loja = (await listarLojas(ctx.client)).find(item => item.id === lojaId);
      res.status(201).json(loja);
    } catch (error) { next(error); }
  }

  async atualizarLoja(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = idParams.parse(req.params);
      const { email, ...campos } = atualizarLojaSchema.parse(req.body);
      const ctx = await ator(req, res, 'lojas'); if (!ctx) return;
      const atual = (await listarLojas(ctx.client)).find(item => item.id === id);
      if (!atual) { res.status(404).json({ erro: 'Loja não encontrada' }); return; }
      if (campos.cnpj && await cnpjEmUso(ctx.client, campos.cnpj, id)) {
        res.status(409).json({ erro: 'Já existe uma loja com este CNPJ' }); return;
      }

      const dados: Record<string, unknown> = { ...campos };
      if (email && email !== atual.responsavel_email?.toLowerCase()) {
        if (atual.responsavel_id) {
          const service = servico(res); if (!service) return;
          const { error } = await service.auth.admin.updateUserById(atual.responsavel_id, { email, email_confirm: true });
          if (error) { falhaDeConta(error, res); return; }
        } else {
          const { data: contaId, error } = await ctx.client.rpc('admin_buscar_conta', { p_email: email });
          if (error) throw error;
          if (!contaId) {
            res.status(404).json({ erro: 'Nenhuma conta com este e-mail. Cadastre a conta antes de vinculá-la à loja.' });
            return;
          }
          dados.responsavel = contaId;
        }
      }

      if (Object.keys(dados).length > 0) {
        const { error } = await ctx.client.rpc('admin_atualizar_loja', { p_id: id, p_dados: dados });
        if (error) {
          if (falhaDeLoja(error, res)) return;
          throw error;
        }
      }
      const loja = (await listarLojas(ctx.client)).find(item => item.id === id);
      res.json(loja);
    } catch (error) { next(error); }
  }

  async excluirLoja(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = idParams.parse(req.params);
      const ctx = await ator(req, res, 'lojas'); if (!ctx) return;
      const { error } = await ctx.client.rpc('admin_excluir_loja', { p_id: id });
      if (error) {
        if (falhaDeLoja(error, res)) return;
        throw error;
      }
      res.status(204).end();
    } catch (error) { next(error); }
  }

  async enviarImagemLoja(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = idParams.parse(req.params);
      const { tipo } = imageQuery.parse(req.query);
      const ctx = await ator(req, res, 'lojas'); if (!ctx) return;
      const { data: loja, error } = await ctx.client.from('lojas').select('id').eq('id', id).maybeSingle();
      if (error) throw error;
      if (!loja) { res.status(404).json({ erro: 'Loja não encontrada' }); return; }
      const resultado = await enviarImagemDaLoja(ctx.client, id, tipo, req.body);
      if (!resultado.ok) { res.status(resultado.status).json({ erro: resultado.erro }); return; }
      res.status(201).json({ url: resultado.url });
    } catch (error) { next(error); }
  }

  async usuarios(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = await ator(req, res, 'usuarios'); if (!ctx) return;
      const { data, error } = await ctx.client.rpc('admin_listar_usuarios');
      if (error) throw error;
      res.json(((data ?? []) as { id: string }[]).map(usuario => ({ ...usuario, voce: usuario.id === req.userId })));
    } catch (error) { next(error); }
  }

  async definirPapel(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = idParams.parse(req.params);
      const input = papelSchema.parse(req.body);
      const ctx = await ator(req, res, 'usuarios'); if (!ctx) return;
      if (id === req.userId) { res.status(403).json({ erro: 'Você não pode alterar o seu próprio papel' }); return; }

      const permissoes = input.role === 'admin' ? permissoesDoTipo(input.admin_tipo, input.admin_permissoes) : null;
      if (input.role === 'admin' && !permissoes) {
        res.status(400).json({ erro: 'Escolha pelo menos uma permissão para o administrador' }); return;
      }
      const { error } = await ctx.client.rpc('admin_definir_papel', {
        p_usuario: id,
        p_role: input.role,
        p_loja: input.role === 'lojista' ? input.loja_id : null,
        p_tipo: input.role === 'admin' ? input.admin_tipo : null,
        p_permissoes: permissoes
      });
      if (error) {
        if (falhaDePapel(error, res)) return;
        throw error;
      }
      const { data, error: listError } = await ctx.client.rpc('admin_listar_usuarios');
      if (listError) throw listError;
      res.json(((data ?? []) as { id: string }[]).find(usuario => usuario.id === id));
    } catch (error) { next(error); }
  }

  async excluirUsuario(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = idParams.parse(req.params);
      const ctx = await ator(req, res, 'usuarios'); if (!ctx) return;
      const { error } = await ctx.client.rpc('admin_validar_exclusao_usuario', { p_usuario: id });
      if (error) {
        if (detalhe(error, 'proprio')) { res.status(403).json({ erro: 'Você não pode excluir a sua própria conta' }); return; }
        if (detalhe(error, 'pedidos')) {
          res.status(409).json({ erro: 'Este usuário tem pedidos e não pode ser excluído, para não apagar o histórico das lojas' });
          return;
        }
        if (falhaDePapel(error, res)) return;
        throw error;
      }
      const service = servico(res); if (!service) return;
      const { error: deleteError } = await service.auth.admin.deleteUser(id);
      if (deleteError) {
        res.status(409).json({ erro: 'Não foi possível excluir este usuário agora' }); return;
      }
      res.status(204).end();
    } catch (error) { next(error); }
  }

  async criarAdministrador(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = criarAdminSchema.parse(req.body);
      const ctx = await ator(req, res, 'usuarios'); if (!ctx) return;
      const permissoes = permissoesDoTipo(input.admin_tipo, input.admin_permissoes);
      if (!permissoes) { res.status(400).json({ erro: 'Escolha pelo menos uma permissão para o administrador' }); return; }
      if (!permissoes.every(permissao => ctx.permissoes.includes(permissao))) {
        res.status(403).json({ erro: 'Você não pode dar permissões que a sua conta não tem' }); return;
      }
      const service = servico(res); if (!service) return;

      const conta = await criarConta(service, input.email, input.senha, input.nome);
      if (conta.error || !conta.data.user) { falhaDeConta(conta.error ?? { message: '' }, res); return; }
      const usuarioId = conta.data.user.id;

      const { error } = await ctx.client.rpc('admin_definir_papel', {
        p_usuario: usuarioId, p_role: 'admin', p_loja: null, p_tipo: input.admin_tipo, p_permissoes: permissoes
      });
      if (error) {
        await service.auth.admin.deleteUser(usuarioId);
        if (falhaDePapel(error, res)) return;
        throw error;
      }
      const { data, error: listError } = await ctx.client.rpc('admin_listar_usuarios');
      if (listError) throw listError;
      res.status(201).json(((data ?? []) as { id: string }[]).find(usuario => usuario.id === usuarioId));
    } catch (error) { next(error); }
  }
}
