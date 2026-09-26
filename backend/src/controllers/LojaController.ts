import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { supabase, createSupabaseClient } from '../config/supabase';

const params = z.object({ id: z.uuid() });
const fields = z.object({
  nome: z.string().trim().min(2).max(255),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(255),
  descricao: z.string().max(5000).nullable().optional()
});
const createSchema = fields.strict();
const updateSchema = fields.partial().strict().refine(
  value => Object.keys(value).length > 0, 'Informe pelo menos um campo'
);

async function permissions(userId: string, token: string) {
  const { data, error } = await createSupabaseClient(token).from('usuarios')
    .select('role, loja_id').eq('id', userId).maybeSingle();
  if (error) throw error;
  return data;
}

export class LojaController {
  async list(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { data, error } = await supabase.from('lojas')
        .select('id, nome, slug, descricao, created_at').order('nome');
      if (error) throw error;
      res.json(data ?? []);
    } catch (error) { next(error); }
  }

  async detail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = params.parse(req.params);
      const { data, error } = await supabase.from('lojas')
        .select('id, nome, slug, descricao, created_at').eq('id', id).maybeSingle();
      if (error) throw error;
      if (!data) { res.status(404).json({ erro: 'Loja não encontrada' }); return; }
      res.json(data);
    } catch (error) { next(error); }
  }

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = createSchema.parse(req.body);
      const perfil = await permissions(req.userId!, req.accessToken!);
      if (perfil?.role !== 'admin') { res.status(403).json({ erro: 'Sem permissão' }); return; }
      const { data, error } = await createSupabaseClient(req.accessToken).from('lojas')
        .insert(input).select().single();
      if (error) {
        if (error.code === '23505') { res.status(409).json({ erro: 'Slug já utilizado' }); return; }
        throw error;
      }
      res.status(201).json(data);
    } catch (error) { next(error); }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = params.parse(req.params);
      const input = updateSchema.parse(req.body);
      const perfil = await permissions(req.userId!, req.accessToken!);
      if (perfil?.role !== 'admin' && !(perfil?.role === 'lojista' && perfil.loja_id === id)) {
        res.status(403).json({ erro: 'Sem permissão' }); return;
      }
      const { data, error } = await createSupabaseClient(req.accessToken).from('lojas')
        .update(input).eq('id', id).select().maybeSingle();
      if (error) {
        if (error.code === '23505') { res.status(409).json({ erro: 'Slug já utilizado' }); return; }
        throw error;
      }
      if (!data) { res.status(404).json({ erro: 'Loja não encontrada' }); return; }
      res.json(data);
    } catch (error) { next(error); }
  }

  async remove(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = params.parse(req.params);
      const perfil = await permissions(req.userId!, req.accessToken!);
      if (perfil?.role !== 'admin') { res.status(403).json({ erro: 'Sem permissão' }); return; }
      // A exclusão é recusada se houver pedidos; o histórico deve ser preservado.
      const client = createSupabaseClient(req.accessToken);
      const { data: pedido, error: consultaError } = await client.from('pedidos')
        .select('id').eq('loja_id', id).limit(1).maybeSingle();
      if (consultaError) throw consultaError;
      if (pedido) { res.status(409).json({ erro: 'Loja possui pedidos' }); return; }
      const { data, error } = await client.from('lojas').delete().eq('id', id).select('id').maybeSingle();
      if (error?.code === '23503') { res.status(409).json({ erro: 'Loja possui pedidos' }); return; }
      if (error) throw error;
      if (!data) { res.status(404).json({ erro: 'Loja não encontrada' }); return; }
      res.status(204).end();
    } catch (error) { next(error); }
  }
}
