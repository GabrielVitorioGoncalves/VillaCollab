import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { createSupabaseClient } from '../config/supabase';
import { enviarImagemDaLoja } from '../services/ImagemLojaService';
import { rpcFailure } from '../errors/rpcFailure';
import { faixaDeId, intervalo, pagina, paginaQuerySchema, termoDeBusca } from '../schemas/paginacao';

const idParams = z.object({ id: z.uuid() });
const pedidosQuerySchema = paginaQuerySchema.extend({
  status: z.enum(['pendente', 'aceito', 'enviado', 'concluido', 'cancelado']).optional()
});
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

  async resumo(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = await lojaDoUsuario(req, res); if (!ctx) return;
      const { data, error } = await ctx.client.rpc('resumo_minha_loja');
      if (error) {
        if (rpcFailure(error, res)) return;
        throw error;
      }
      res.json(data);
    } catch (error) { next(error); }
  }

  async produtos(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { pagina: numero, por_pagina: porPagina = 20, busca } = paginaQuerySchema.parse(req.query);
      const ctx = await lojaDoUsuario(req, res); if (!ctx) return;
      if (numero) {
        let consulta = ctx.client.from('produtos').select('*', { count: 'exact' }).eq('loja_id', ctx.lojaId);
        const termo = termoDeBusca(busca);
        const faixa = faixaDeId(busca);
        if (termo) {
          consulta = consulta.or([
            `nome.ilike.*${termo}*`, `categoria.ilike.*${termo}*`,
            ...(faixa ? [`and(id.gte.${faixa.de},id.lte.${faixa.ate})`] : [])
          ].join(','));
        }
        const [inicio, fim] = intervalo(numero, porPagina);
        const { data, error, count } = await consulta.order('nome').order('id').range(inicio, fim);
        if (error) throw error;
        res.json(pagina(data ?? [], count, numero, porPagina));
        return;
      }
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
      const { pagina: numero, por_pagina: porPagina = 20, busca, status } = pedidosQuerySchema.parse(req.query);
      const ctx = await lojaDoUsuario(req, res); if (!ctx) return;
      if (numero) {
        const clientes = await clientesDaLoja(ctx.client, ctx.lojaId);
        let consulta = ctx.client.from('pedidos').select(pedidoSelect, { count: 'exact' }).eq('loja_id', ctx.lojaId);
        if (status) consulta = consulta.eq('status', status);
        const termo = termoDeBusca(busca)?.toLowerCase().replace(/^#/, '');
        if (termo) {
          const faixa = faixaDeId(termo);
          const ids = [...clientes].filter(([, cliente]) =>
            (cliente.nome ?? '').toLowerCase().includes(termo) || (cliente.email ?? '').toLowerCase().includes(termo)
          ).map(([id]) => id).slice(0, 200);
          const condicoes = [
            ...(ids.length > 0 ? [`usuario_id.in.(${ids.join(',')})`] : []),
            ...(faixa ? [`and(id.gte.${faixa.de},id.lte.${faixa.ate})`] : [])
          ];
          if (condicoes.length === 0) { res.json(pagina([], 0, numero, porPagina)); return; }
          consulta = consulta.or(condicoes.join(','));
        }
        const [inicio, fim] = intervalo(numero, porPagina);
        const { data, error, count } = await consulta
          .order('created_at', { ascending: false }).order('id').range(inicio, fim);
        if (error) throw error;
        const pedidos = (data ?? []) as unknown as PedidoRow[];
        res.json(pagina(pedidos.map(pedido => ({ ...pedido, cliente: clientes.get(pedido.usuario_id) ?? null })),
          count, numero, porPagina));
        return;
      }
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
