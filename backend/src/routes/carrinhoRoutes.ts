import { Router } from 'express';
import { CarrinhoController } from '../controllers/CarrinhoController';
import { authMiddleware } from '../middlewares/authMiddleware';

const router = Router();
const controller = new CarrinhoController();
router.use(authMiddleware);
router.get('/', controller.get);
router.put('/', controller.replace);
export default router;
