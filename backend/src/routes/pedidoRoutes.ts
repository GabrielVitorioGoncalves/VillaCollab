import { Router } from 'express';
import { PedidoController } from '../controllers/PedidoController';
import { authMiddleware } from '../middlewares/authMiddleware';

const router = Router();
const controller = new PedidoController();
router.use(authMiddleware);
router.post('/', controller.create);
router.get('/meus', controller.mine);
router.get('/loja/:loja_id', controller.byStore);
router.get('/:id', controller.detail);
router.patch('/:id/status', controller.updateStatus);
export default router;
