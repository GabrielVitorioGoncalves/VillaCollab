import { Request, Response, NextFunction } from 'express';
import { ProdutoService } from '../services/ProdutoService';
import { produtoSchema, lojaParamsSchema, produtoParamsSchema, produtoUpdateSchema } from '../schemas/produtoSchema';

const produtoService = new ProdutoService();

export class ProdutoController {
  async excluir(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = produtoParamsSchema.parse(req.params);
      if (req.body !== undefined) {
        res.status(400).json({ erro: 'Esta rota não aceita body' });
        return;
      }
      if (!req.userId || !req.accessToken) {
        res.status(401).json({ erro: 'Autenticação necessária' });
        return;
      }
      const resultado = await produtoService.excluirProduto(id, req.userId, req.accessToken);
      if (resultado.status === 'not_found') {
        res.status(404).json({ erro: 'Produto não encontrado.' });
        return;
      }
      if (resultado.status === 'forbidden') {
        res.status(403).json({ erro: 'Sem permissão para excluir este produto' });
        return;
      }
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  }

  async atualizar(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = produtoParamsSchema.parse(req.params);
      const dados = produtoUpdateSchema.parse(req.body);
      if (!req.userId || !req.accessToken) {
        res.status(401).json({ erro: 'Autenticação necessária' });
        return;
      }
      const resultado = await produtoService.atualizarProduto(id, dados, req.userId, req.accessToken);
      if (resultado.status === 'not_found') {
        res.status(404).json({ erro: 'Produto não encontrado.' });
        return;
      }
      if (resultado.status === 'forbidden') {
        res.status(403).json({ erro: 'Sem permissão para editar este produto' });
        return;
      }
      res.status(200).json(resultado.produto);
    } catch (error) {
      next(error);
    }
  }

  async buscarPorId(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = produtoParamsSchema.parse(req.params);
      const produto = await produtoService.buscarProdutoPorId(id);
      if (!produto) {
        res.status(404).json({ erro: 'Produto não encontrado.' });
        return;
      }
      res.status(200).json(produto);
    } catch (error) {
      next(error);
    }
  }

  async criar(req: Request, res: Response, next: NextFunction) {
    try {
      const dadosValidados = produtoSchema.parse(req.body);

      if (!req.userId || !req.accessToken) {
        res.status(401).json({ erro: 'Autenticação necessária' });
        return;
      }
      const novoProduto = await produtoService.criarProduto(
        dadosValidados, req.userId, req.accessToken
      );
      if (!novoProduto) {
        res.status(403).json({ erro: 'Sem permissão para cadastrar produtos nesta loja' });
        return;
      }
      res.status(201).json(novoProduto);
    } catch (error) {
      next(error); 
    }
  }

  async listar(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { loja_id } = lojaParamsSchema.parse(req.params);
      
      const produtos = await produtoService.listarProdutos(loja_id);
      
      res.status(200).json(produtos);
    } catch (error) {
      next(error);
    }
  }
}
