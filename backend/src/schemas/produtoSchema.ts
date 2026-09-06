import { z } from 'zod';

export const produtoSchema = z.object({
  nome: z.string().min(3, 'O nome deve ter no mínimo 3 caracteres'),
  preco: z.number().positive('O preço deve ser maior que zero'),
  loja_id: z.string().uuid('ID da loja inválido'),
  descricao: z.string().optional()
});

export type ProdutoInput = z.infer<typeof produtoSchema>;