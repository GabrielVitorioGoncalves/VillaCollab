import { z } from 'zod';

// Identificadores curtos usados em filtros e variações (ex.: "tamanho", "preto").
export const codigoSchema = z.string().trim().toLowerCase().regex(/^[a-z0-9_-]{1,40}$/, 'Código inválido');
const rotuloSchema = z.string().trim().min(1).max(60);

export const urlImagemSchema = z.url({ protocol: /^https?$/ }).max(2048);

export const opcaoSchema = z.object({ id: codigoSchema, nome: rotuloSchema }).strict();

// lojas.filtros: filtros que aparecem na barra lateral da loja.
export const filtrosLojaSchema = z.array(z.object({
  id: codigoSchema,
  nome: rotuloSchema,
  tipo: z.enum(['checkbox', 'radio']),
  opcoes: z.array(opcaoSchema).min(1).max(50)
}).strict()).max(10);

// produtos.filtros: em quais opções dos filtros da loja o produto se encaixa.
export const filtrosProdutoSchema = z.record(codigoSchema, z.array(codigoSchema).max(50));

// produtos.atributos: ficha técnica ("Marca: Logitech").
export const atributosSchema = z.array(z.object({
  nome: rotuloSchema,
  valor: z.string().trim().min(1).max(255)
}).strict()).max(30);

// produtos.variacoes: o cliente escolhe uma opção de cada variação antes de comprar.
export const variacoesSchema = z.array(z.object({
  id: codigoSchema,
  nome: rotuloSchema,
  opcoes: z.array(opcaoSchema).min(1).max(30)
}).strict()).max(5);

export const enderecoSchema = z.object({
  nome: z.string().trim().min(2).max(255).optional(),
  cep: z.string().trim().regex(/^\d{5}-?\d{3}$/, 'CEP inválido'),
  rua: z.string().trim().min(2).max(255),
  numero: z.string().trim().min(1).max(20),
  complemento: z.string().trim().max(255).optional(),
  bairro: z.string().trim().min(2).max(120),
  cidade: z.string().trim().min(2).max(120),
  estado: z.string().trim().regex(/^[A-Za-z]{2}$/, 'UF inválida').transform(uf => uf.toUpperCase())
}).strict();

export type Endereco = z.infer<typeof enderecoSchema>;
