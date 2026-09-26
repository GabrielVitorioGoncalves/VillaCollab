import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { createSupabaseClient } from '../config/supabase';

const params = z.object({ id: z.uuid() });
const body = z.object({ estoque: z.number().int().min(0).max(2147483647) }).strict();

export class EstoqueController {
  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = params.parse(req.params);
      const { estoque } = body.parse(req.body);
      const client = createSupabaseClient(req.accessToken);
      const { data: produto, error: produtoError } = await client.from('produtos')
        .select('loja_id').eq('id', id).maybeSingle();
      if (produtoError) throw produtoError;
      if (!produto) { res.status(404).json({ erro: 'Produto não encontrado' }); return; }
      const { data: perfil, error: perfilError } = await client.from('usuarios')
        .select('role, loja_id').eq('id', req.userId!).maybeSingle();
      if (perfilError) throw perfilError;
      if (perfil?.role !== 'lojista' || perfil.loja_id !== produto.loja_id) {
        res.status(403).json({ erro: 'Sem permissão' }); return;
      }
      const { data, error } = await client.from('produtos').update({ estoque })
        .eq('id', id).eq('loja_id', produto.loja_id).select().maybeSingle();
      if (error) throw error;
      if (!data) { res.status(404).json({ erro: 'Produto não encontrado' }); return; }
      res.json(data);
    } catch (error) { next(error); }
  }
}
