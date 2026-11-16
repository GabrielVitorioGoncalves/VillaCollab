import { Router } from 'express';
import { PedidoController } from '../controllers/PedidoController';
import { authMiddleware } from '../middlewares/authMiddleware';
import { limitePedidos } from '../middlewares/rateLimit';

const router = Router();
const controller = new PedidoController();
router.use(authMiddleware);
router.post('/', limitePedidos, controller.create);
router.get('/meus', controller.mine);
router.get('/loja/:loja_id', controller.byStore);
router.get('/:id', controller.detail);
router.patch('/:id/status', controller.updateStatus);
export default router;
