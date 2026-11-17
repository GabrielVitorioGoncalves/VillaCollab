import { z } from 'zod';

export const paginaQuerySchema = z.object({
  pagina: z.coerce.number().int().min(1).max(10000).optional(),
  por_pagina: z.coerce.number().int().min(1).max(50).optional(),
  busca: z.string().max(100).optional()
});

export type Pagina<T> = { itens: T[]; total: number; pagina: number; por_pagina: number };

export function intervalo(pagina: number, porPagina: number): [number, number] {
  const inicio = (pagina - 1) * porPagina;
  return [inicio, inicio + porPagina - 1];
}

export function termoDeBusca(texto: string | undefined): string | null {
  const limpo = (texto ?? '').replace(/[,()*%\\:"'`]/g, ' ').replace(/\s+/g, ' ').trim();
  return limpo.length > 0 ? limpo : null;
}

export function faixaDeId(texto: string | undefined): { de: string; ate: string } | null {
  const hex = (texto ?? '').trim().toLowerCase().replace(/^#/, '').replace(/-/g, '');
  if (!/^[0-9a-f]{4,32}$/.test(hex)) return null;
  const formatar = (valor: string) =>
    `${valor.slice(0, 8)}-${valor.slice(8, 12)}-${valor.slice(12, 16)}-${valor.slice(16, 20)}-${valor.slice(20)}`;
  return { de: formatar(hex.padEnd(32, '0')), ate: formatar(hex.padEnd(32, 'f')) };
}

export function pagina<T>(itens: T[], total: number | null, numero: number, porPagina: number): Pagina<T> {
  return { itens, total: total ?? itens.length, pagina: numero, por_pagina: porPagina };
}
