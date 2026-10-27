import { Router } from 'express';
import { ProdutoController } from '../controllers/ProdutoController';
import { authMiddleware } from '../middlewares/authMiddleware';
import { EstoqueController } from '../controllers/EstoqueController';
import { AvaliacaoController } from '../controllers/AvaliacaoController';

const router = Router();
const produtoController = new ProdutoController();
const estoqueController = new EstoqueController();
const avaliacaoController = new AvaliacaoController();

router.post('/', authMiddleware, produtoController.criar);
router.get('/loja/:loja_id', produtoController.listar);
router.get('/:id', produtoController.buscarPorId);
router.patch('/:id/estoque', authMiddleware, estoqueController.update);
router.post('/:id/avaliacoes', authMiddleware, avaliacaoController.create);
router.patch('/:id', authMiddleware, produtoController.atualizar);
router.delete('/:id', authMiddleware, produtoController.excluir);

export default router;
