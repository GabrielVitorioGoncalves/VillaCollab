import { Router } from 'express';
import { ProdutoController } from '../controllers/ProdutoController';

const router = Router();
const produtoController = new ProdutoController();

router.post('/', produtoController.criar);
router.get('/loja/:loja_id', produtoController.listar);

export default router;