import { z } from 'zod';

const uuidSchema = z.string().uuid('ID inválido');

export const lojaParamsSchema = z.object({
  loja_id: uuidSchema
});

export const produtoParamsSchema = z.object({
  id: uuidSchema
});

export const produtoSchema = z.object({
  nome: z.string().trim().min(3, 'O nome deve ter no mínimo 3 caracteres')
    .max(255, 'O nome deve ter no máximo 255 caracteres'),
  preco: z.number().positive('O preço deve ser maior que zero')
    .max(99999999.99, 'Preço acima do limite permitido')
    .multipleOf(0.01, 'O preço deve ter no máximo duas casas decimais'),
  loja_id: lojaParamsSchema.shape.loja_id,
  descricao: z.string().optional()
});

export type ProdutoInput = z.infer<typeof produtoSchema>;

export const produtoUpdateSchema = produtoSchema
  .pick({ nome: true, preco: true, descricao: true })
  .partial()
  .strict()
  .refine(dados => Object.values(dados).some(valor => valor !== undefined), {
    message: 'Informe pelo menos um campo editável'
  });

export type ProdutoUpdateInput = z.infer<typeof produtoUpdateSchema>;
