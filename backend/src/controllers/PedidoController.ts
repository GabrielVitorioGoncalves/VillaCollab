import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { createSupabaseClient } from '../config/supabase';
import { rpcFailure } from '../errors/rpcFailure';
import { codigoSchema, enderecoSchema } from '../schemas/catalogoSchema';

const idSchema = z.object({ id: z.uuid() });
const lojaSchema = z.object({ loja_id: z.uuid() });

function chaveItem(item: { produto_id: string; variacoes?: Record<string, string> }) {
  const variacoes = Object.entries(item.variacoes ?? {}).sort(([a], [b]) => a.localeCompare(b));
  return `${item.produto_id}|${JSON.stringify(variacoes)}`;
}

const createSchema = z.object({
  loja_id: z.uuid(),
  itens: z.array(z.object({
    produto_id: z.uuid(),
    quantidade: z.number().int().min(1).max(1000),
    variacoes: z.record(codigoSchema, codigoSchema).optional()
  }).strict()).min(1).max(50),
  endereco_entrega: enderecoSchema.extend({ nome: z.string().trim().min(2).max(255) }).optional(),
  forma_pagamento: z.enum(['pix', 'cartao']).optional(),
  parcelas: z.number().int().min(1).max(12).optional()
}).strict()
  .refine(value => new Set(value.itens.map(chaveItem)).size === value.itens.length,
    'Não repita produtos no pedido')
  .refine(value => value.parcelas === undefined || value.forma_pagamento === 'cartao',
    'Parcelamento só no cartão');

const statusSchema = z.object({ status: z.enum(['aceito', 'enviado', 'concluido', 'cancelado']) }).strict();
const idempotencySchema = z.uuid().optional();
const select = 'id, usuario_id, loja_id, status, total, created_at, updated_at, endereco_entrega, forma_pagamento, parcelas, '
  + 'itens_pedido(id, produto_id, quantidade, preco_unitario, subtotal, variacoes)';

export class PedidoController {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { loja_id, itens, endereco_entrega, forma_pagamento, parcelas } = createSchema.parse(req.body);
      const chave = idempotencySchema.parse(req.get('Idempotency-Key') || undefined);
      const client = createSupabaseClient(req.accessToken);
      const { data: id, error } = await client.rpc('criar_pedido', {
        p_loja_id: loja_id,
        p_itens: itens,
        ...(endereco_entrega ? { p_endereco: endereco_entrega } : {}),
        ...(forma_pagamento ? { p_forma_pagamento: forma_pagamento } : {}),
        ...(parcelas !== undefined ? { p_parcelas: parcelas } : {}),
        ...(chave ? { p_chave: chave } : {})
      });
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
