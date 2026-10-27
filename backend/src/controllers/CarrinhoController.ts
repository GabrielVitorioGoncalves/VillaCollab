import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { createSupabaseClient } from '../config/supabase';
import { rpcFailure } from '../errors/rpcFailure';
import { codigoSchema } from '../schemas/catalogoSchema';

function chaveItem(item: { produto_id: string; variacoes?: Record<string, string> }) {
  const variacoes = Object.entries(item.variacoes ?? {}).sort(([a], [b]) => a.localeCompare(b));
  return `${item.produto_id}|${JSON.stringify(variacoes)}`;
}

const putSchema = z.object({
  itens: z.array(z.object({
    produto_id: z.uuid(),
    quantidade: z.number().int().min(1).max(1000),
    variacoes: z.record(codigoSchema, codigoSchema).optional()
  }).strict()).max(100)
}).strict().refine(value => new Set(value.itens.map(chaveItem)).size === value.itens.length,
  'Não repita produtos no carrinho');

const select = 'produto_id, variacoes, quantidade, '
  + 'produtos(id, loja_id, nome, preco, estoque, imagens, variacoes, lojas(nome))';

export class CarrinhoController {
  async get(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { data, error } = await createSupabaseClient(req.accessToken).from('carrinho_itens')
        .select(select).eq('usuario_id', req.userId!).order('created_at');
      if (error) throw error;
      res.json(data ?? []);
    } catch (error) { next(error); }
  }

  async replace(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { itens } = putSchema.parse(req.body);
      const client = createSupabaseClient(req.accessToken);
      const { error } = await client.rpc('substituir_carrinho', { p_itens: itens });
      if (error) {
        if (rpcFailure(error, res, { INVALID: 'Carrinho inválido' })) return;
        throw error;
      }
      const { data, error: readError } = await client.from('carrinho_itens')
        .select(select).eq('usuario_id', req.userId!).order('created_at');
      if (readError) throw readError;
      res.json(data ?? []);
    } catch (error) { next(error); }
  }
}
