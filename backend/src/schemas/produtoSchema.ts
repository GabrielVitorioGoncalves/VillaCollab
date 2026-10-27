import { z } from 'zod';
import {
  atributosSchema,
  filtrosProdutoSchema,
  urlImagemSchema,
  variacoesSchema
} from './catalogoSchema';

const uuidSchema = z.string().uuid('ID inválido');

export const lojaParamsSchema = z.object({
  loja_id: uuidSchema
});

export const produtoParamsSchema = z.object({
  id: uuidSchema
});

const precoSchema = z.number().positive('O preço deve ser maior que zero')
  .max(99999999.99, 'Preço acima do limite permitido')
  .multipleOf(0.01, 'O preço deve ter no máximo duas casas decimais');

const nomeSchema = z.string().trim().min(3, 'O nome deve ter no mínimo 3 caracteres')
  .max(255, 'O nome deve ter no máximo 255 caracteres');

const vitrineSchema = {
  categoria: z.string().trim().min(1).max(100).optional(),
  preco_antigo: precoSchema.nullable().optional(),
  imagens: z.array(urlImagemSchema).max(10).optional(),
  atributos: atributosSchema.optional(),
  variacoes: variacoesSchema.optional(),
  filtros: filtrosProdutoSchema.optional(),
  ativo: z.boolean().optional()
};

export const produtoSchema = z.object({
  nome: nomeSchema,
  preco: precoSchema,
  loja_id: lojaParamsSchema.shape.loja_id,
  descricao: z.string().optional(),
  ...vitrineSchema
});

export type ProdutoInput = z.infer<typeof produtoSchema>;

export const produtoUpdateSchema = z.object({
  nome: nomeSchema.optional(),
  preco: precoSchema.optional(),
  descricao: z.string().optional(),
  ...vitrineSchema
})
  .strict()
  .refine(dados => Object.values(dados).some(valor => valor !== undefined), {
    message: 'Informe pelo menos um campo editável'
  });

export type ProdutoUpdateInput = z.infer<typeof produtoUpdateSchema>;
