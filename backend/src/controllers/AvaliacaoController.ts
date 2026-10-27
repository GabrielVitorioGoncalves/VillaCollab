import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { createSupabaseClient } from '../config/supabase';
import { rpcFailure } from '../errors/rpcFailure';

const params = z.object({ id: z.uuid() });
const body = z.object({
  nota: z.number().int().min(1).max(5),
  comentario: z.string().trim().max(2000).optional()
}).strict();

export class AvaliacaoController {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = params.parse(req.params);
      const { nota, comentario } = body.parse(req.body);
      const client = createSupabaseClient(req.accessToken);
      const { error } = await client.rpc('avaliar_produto', {
        p_produto_id: id, p_nota: nota, p_comentario: comentario ?? null
      });
      if (error) {
        if (rpcFailure(error, res, {
          FORBIDDEN: 'Só é possível avaliar produtos de pedidos concluídos',
          NOT_FOUND: 'Produto não encontrado',
          INVALID: 'Dados inválidos'
        })) return;
        throw error;
      }
      const { data, error: readError } = await client.from('produtos')
        .select('id, nota_media, total_avaliacoes').eq('id', id).maybeSingle();
      if (readError || !data) throw readError ?? new Error('Produto indisponível');
      res.status(201).json(data);
    } catch (error) { next(error); }
  }
}
