import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { createSupabaseClient } from '../config/supabase';
import { enviarImagemDaLoja } from '../services/ImagemLojaService';

const idParams = z.object({ id: z.uuid() });
const imageQuery = z.object({ tipo: z.enum(['produto', 'logo', 'banner']) });

const pedidoSelect = 'id, usuario_id, loja_id, status, total, created_at, updated_at, '
  + 'endereco_entrega, forma_pagamento, parcelas, '
  + 'itens_pedido(id, produto_id, quantidade, preco_unitario, subtotal, variacoes, produtos(nome, imagens, variacoes))';

type Client = ReturnType<typeof createSupabaseClient>;
type PedidoRow = Record<string, unknown> & { usuario_id: string };

async function lojaDoUsuario(req: Request, res: Response): Promise<{ client: Client; lojaId: string } | null> {
  const client = createSupabaseClient(req.accessToken);
  const { data: perfil, error } = await client.from('usuarios')
    .select('role, loja_id').eq('id', req.userId!).maybeSingle();
  if (error) throw error;
  if (perfil?.role !== 'lojista' || !perfil.loja_id) {
    res.status(403).json({ erro: 'Acesso restrito a lojistas' });
    return null;
  }
  return { client, lojaId: perfil.loja_id };
}

interface Cliente { usuario_id: string; nome: string | null; telefone: string | null; email: string | null }

async function clientesDaLoja(client: Client, lojaId: string) {
  const { data, error } = await client.rpc('clientes_da_loja', { p_loja_id: lojaId });
  if (error) throw error;
  const map = new Map<string, Omit<Cliente, 'usuario_id'>>();
  for (const cliente of (data ?? []) as Cliente[]) {
    map.set(cliente.usuario_id, { nome: cliente.nome, telefone: cliente.telefone, email: cliente.email });
  }
  return map;
}

export class MinhaLojaController {
  async loja(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = await lojaDoUsuario(req, res); if (!ctx) return;
      const { data, error } = await ctx.client.from('lojas').select('*').eq('id', ctx.lojaId).maybeSingle();
      if (error) throw error;
      if (!data) { res.status(404).json({ erro: 'Loja não encontrada' }); return; }
      res.json(data);
    } catch (error) { next(error); }
  }

  async produtos(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = await lojaDoUsuario(req, res); if (!ctx) return;
      const { data, error } = await ctx.client.from('produtos').select('*')
        .eq('loja_id', ctx.lojaId).order('nome');
      if (error) throw error;
      res.json(data ?? []);
    } catch (error) { next(error); }
  }

  async produto(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = idParams.parse(req.params);
      const ctx = await lojaDoUsuario(req, res); if (!ctx) return;
      const { data, error } = await ctx.client.from('produtos').select('*')
        .eq('id', id).eq('loja_id', ctx.lojaId).maybeSingle();
      if (error) throw error;
      if (!data) { res.status(404).json({ erro: 'Produto não encontrado.' }); return; }
      res.json(data);
    } catch (error) { next(error); }
  }

  async pedidos(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = await lojaDoUsuario(req, res); if (!ctx) return;
      const { data, error } = await ctx.client.from('pedidos').select(pedidoSelect)
        .eq('loja_id', ctx.lojaId).order('created_at', { ascending: false });
      if (error) throw error;
      const clientes = await clientesDaLoja(ctx.client, ctx.lojaId);
      const pedidos = (data ?? []) as unknown as PedidoRow[];
      res.json(pedidos.map(pedido => ({ ...pedido, cliente: clientes.get(pedido.usuario_id) ?? null })));
    } catch (error) { next(error); }
  }

  async pedido(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = idParams.parse(req.params);
      const ctx = await lojaDoUsuario(req, res); if (!ctx) return;
      const { data, error } = await ctx.client.from('pedidos').select(pedidoSelect)
        .eq('id', id).eq('loja_id', ctx.lojaId).maybeSingle();
      if (error) throw error;
      if (!data) { res.status(404).json({ erro: 'Pedido não encontrado' }); return; }
      const clientes = await clientesDaLoja(ctx.client, ctx.lojaId);
      const pedido = data as unknown as PedidoRow;
      res.json({ ...pedido, cliente: clientes.get(pedido.usuario_id) ?? null });
    } catch (error) { next(error); }
  }

  async enviarImagem(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tipo } = imageQuery.parse(req.query);
      const ctx = await lojaDoUsuario(req, res); if (!ctx) return;
      const resultado = await enviarImagemDaLoja(ctx.client, ctx.lojaId, tipo, req.body);
      if (!resultado.ok) { res.status(resultado.status).json({ erro: resultado.erro }); return; }
      res.status(201).json({ url: resultado.url });
    } catch (error) { next(error); }
  }
}
