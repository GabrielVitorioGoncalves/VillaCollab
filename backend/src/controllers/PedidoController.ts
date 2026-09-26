import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { createSupabaseClient } from '../config/supabase';

const idSchema = z.object({ id: z.uuid() });
const lojaSchema = z.object({ loja_id: z.uuid() });
const createSchema = z.object({
  loja_id: z.uuid(),
  itens: z.array(z.object({ produto_id: z.uuid(), quantidade: z.number().int().min(1).max(1000) }).strict())
    .min(1).max(50)
}).strict().refine(value => new Set(value.itens.map(item => item.produto_id)).size === value.itens.length,
  'Não repita produtos no pedido');
const statusSchema = z.object({ status: z.enum(['aceito', 'concluido', 'cancelado']) }).strict();
const select = 'id, usuario_id, loja_id, status, total, created_at, updated_at, itens_pedido(id, produto_id, quantidade, preco_unitario, subtotal)';

function rpcFailure(error: { message: string; code?: string }, res: Response): boolean {
  // Os códigos de domínio são produzidos pelas funções SQL da migração.
  const match = /^VC_(INVALID|FORBIDDEN|NOT_FOUND|CONFLICT|STOCK)(?:\b|:)/.exec(error.message);
  if (!match) return false;
  const statusMap: Record<string, number> = { INVALID: 400, FORBIDDEN: 403, NOT_FOUND: 404, CONFLICT: 409, STOCK: 409 };
  const status = statusMap[match[1]];
  res.status(status).json({ erro: {
    INVALID: 'Pedido inválido', FORBIDDEN: 'Sem permissão', NOT_FOUND: 'Pedido ou produto não encontrado',
    CONFLICT: 'Operação incompatível com o estado do pedido', STOCK: 'Estoque insuficiente'
  }[match[1]] });
  return true;
}

export class PedidoController {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { loja_id, itens } = createSchema.parse(req.body);
      const client = createSupabaseClient(req.accessToken);
      const { data: id, error } = await client.rpc('criar_pedido', { p_loja_id: loja_id, p_itens: itens });
      if (error) { if (rpcFailure(error, res)) return; throw error; }
      const { data, error: readError } = await client.from('pedidos').select(select).eq('id', id).maybeSingle();
      if (readError || !data) throw readError ?? new Error('Pedido criado, mas não disponível para leitura');
      res.status(201).json(data);
    } catch (error) { next(error); }
  }

  async mine(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { data, error } = await createSupabaseClient(req.accessToken).from('pedidos')
        .select(select).eq('usuario_id', req.userId!).order('created_at', { ascending: false });
      if (error) throw error;
      res.json(data ?? []);
    } catch (error) { next(error); }
  }

  async byStore(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { loja_id } = lojaSchema.parse(req.params);
      const client = createSupabaseClient(req.accessToken);
      const { data: perfil, error: profileError } = await client.from('usuarios')
        .select('role, loja_id').eq('id', req.userId!).maybeSingle();
      if (profileError) throw profileError;
      if (perfil?.role !== 'admin' && !(perfil?.role === 'lojista' && perfil.loja_id === loja_id)) {
        res.status(403).json({ erro: 'Sem permissão' }); return;
      }
      const { data, error } = await client.from('pedidos').select(select)
        .eq('loja_id', loja_id).order('created_at', { ascending: false });
      if (error) throw error;
      res.json(data ?? []);
    } catch (error) { next(error); }
  }

  async detail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = idSchema.parse(req.params);
      const { data, error } = await createSupabaseClient(req.accessToken).from('pedidos')
        .select(select).eq('id', id).maybeSingle();
      if (error) throw error;
      if (!data) { res.status(404).json({ erro: 'Pedido não encontrado' }); return; }
      res.json(data);
    } catch (error) { next(error); }
  }

  async updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = idSchema.parse(req.params);
      const { status } = statusSchema.parse(req.body);
      const client = createSupabaseClient(req.accessToken);
      const { error } = await client.rpc('atualizar_status_pedido', { p_pedido_id: id, p_status: status });
      if (error) { if (rpcFailure(error, res)) return; throw error; }
      const { data, error: readError } = await client.from('pedidos').select(select).eq('id', id).maybeSingle();
      if (readError || !data) throw readError ?? new Error('Pedido atualizado, mas indisponível para leitura');
      res.json(data);
    } catch (error) { next(error); }
  }
}
