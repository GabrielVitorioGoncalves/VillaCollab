import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { createSupabaseClient } from '../config/supabase';
import { rpcFailure } from '../errors/rpcFailure';

const params = z.object({ id: z.uuid() });
const body = z.object({ role: z.enum(['lojista', 'cliente']), loja_id: z.uuid().nullable() }).strict()
  .refine(value => (value.role === 'lojista') === (value.loja_id !== null),
    'Lojista precisa de loja; cliente não pode ter loja');

function gereUsuarios(actor: { role?: string; admin_permissoes?: string[] | null } | null) {
  return actor?.role === 'admin' && (!actor.admin_permissoes || actor.admin_permissoes.includes('usuarios'));
}

export class UsuarioController {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const client = createSupabaseClient(req.accessToken);
      const { data: actor, error: actorError } = await client.from('usuarios')
        .select('role, admin_permissoes').eq('id', req.userId!).maybeSingle();
      if (actorError) throw actorError;
      if (!gereUsuarios(actor)) { res.status(403).json({ erro: 'Sem permissão' }); return; }
      const { data, error } = await client.from('usuarios')
        .select('id, nome, role, loja_id').order('nome');
      if (error) throw error;
      res.json(data ?? []);
    } catch (error) { next(error); }
  }

  async assignStore(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = params.parse(req.params);
      const input = body.parse(req.body);
      const client = createSupabaseClient(req.accessToken);
      const { data: actor, error: actorError } = await client.from('usuarios')
        .select('role, admin_permissoes').eq('id', req.userId!).maybeSingle();
      if (actorError) throw actorError;
      if (!gereUsuarios(actor)) { res.status(403).json({ erro: 'Sem permissão' }); return; }
      const { data: target, error: targetError } = await client.from('usuarios')
        .select('role').eq('id', id).maybeSingle();
      if (targetError) throw targetError;
      if (!target) { res.status(404).json({ erro: 'Usuário não encontrado' }); return; }
      if (target.role === 'admin') { res.status(403).json({ erro: 'Administrador não pode ser alterado nesta rota' }); return; }
      if (input.loja_id) {
        const { data: loja, error: lojaError } = await client.from('lojas')
          .select('id').eq('id', input.loja_id).maybeSingle();
        if (lojaError) throw lojaError;
        if (!loja) { res.status(404).json({ erro: 'Loja não encontrada' }); return; }
      }
      const { data, error } = await client.from('usuarios').update(input)
        .eq('id', id).neq('role', 'admin').select('id, nome, role, loja_id').maybeSingle();
      if (error) {
        if (rpcFailure(error, res, { FORBIDDEN: 'Sem permissão', INVALID: 'Dados inválidos' })) return;
        throw error;
      }
      if (!data) { res.status(409).json({ erro: 'Vínculo alterado durante a operação' }); return; }
      res.json(data);
    } catch (error) { next(error); }
  }
}
