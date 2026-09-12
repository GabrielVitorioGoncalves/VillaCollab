import { Router } from 'express';
import { ProdutoController } from '../controllers/ProdutoController';
import { authMiddleware } from '../middlewares/authMiddleware';

const router = Router();
const produtoController = new ProdutoController();

router.post('/', authMiddleware, produtoController.criar);
router.get('/loja/:loja_id', produtoController.listar);
router.get('/:id', produtoController.buscarPorId);
router.patch('/:id', authMiddleware, produtoController.atualizar);
router.delete('/:id', authMiddleware, produtoController.excluir);

export default router;
