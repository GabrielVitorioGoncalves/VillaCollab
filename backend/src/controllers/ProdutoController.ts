import { Request, Response, NextFunction } from 'express';
import { ProdutoService } from '../services/ProdutoService';
import { produtoSchema } from '../schemas/produtoSchema';

const produtoService = new ProdutoService();

export class ProdutoController {
  async criar(req: Request, res: Response, next: NextFunction) {
    try {
      const dadosValidados = produtoSchema.parse(req.body);
      
      const novoProduto = await produtoService.criarProduto(dadosValidados);
      res.status(201).json(novoProduto);
    } catch (error) {
      next(error); 
    }
  }

async listar(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // O 'as string' garante ao TypeScript que este valor não será um array
      const loja_id = req.params.loja_id as string;
      
      const produtos = await produtoService.listarProdutos(loja_id);
      
      res.status(200).json(produtos);
    } catch (error) {
      next(error);
    }
  }
}