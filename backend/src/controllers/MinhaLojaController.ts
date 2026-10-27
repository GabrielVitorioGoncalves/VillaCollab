import { randomUUID } from 'node:crypto';
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { createSupabaseClient } from '../config/supabase';

const BUCKET = 'lojas';
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
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

function detectImage(buffer: Buffer): { ext: string; type: string } | null {
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return { ext: 'png', type: 'image/png' };
  }
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { ext: 'jpg', type: 'image/jpeg' };
  }
  if (buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') {
    return { ext: 'webp', type: 'image/webp' };
  }
  return null;
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
      if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
        res.status(415).json({ erro: 'Envie uma imagem PNG, JPG ou WEBP' }); return;
      }
      if (req.body.length > MAX_IMAGE_BYTES) {
        res.status(413).json({ erro: 'A imagem pode ter no máximo 5 MB' }); return;
      }
      const image = detectImage(req.body);
      if (!image) { res.status(400).json({ erro: 'O arquivo não é uma imagem PNG, JPG ou WEBP válida' }); return; }

      const path = `${ctx.lojaId}/${tipo}/${randomUUID()}.${image.ext}`;
      const storage = ctx.client.storage.from(BUCKET);
      const { error } = await storage.upload(path, req.body, { contentType: image.type, upsert: false });
      if (error) {
        console.error('Falha ao enviar imagem para o Storage');
        res.status(502).json({ erro: 'Não foi possível salvar a imagem agora' });
        return;
      }
      res.status(201).json({ url: storage.getPublicUrl(path).data.publicUrl });
    } catch (error) { next(error); }
  }
}
