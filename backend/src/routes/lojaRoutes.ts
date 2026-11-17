import { Router } from 'express';
import { LojaController } from '../controllers/LojaController';
import { authMiddleware, autenticacaoOpcional } from '../middlewares/authMiddleware';

const router = Router();
const controller = new LojaController();
router.get('/', controller.list);
router.get('/:id', autenticacaoOpcional, controller.detail);
router.post('/', authMiddleware, controller.create);
router.patch('/:id', authMiddleware, controller.update);
router.delete('/:id', authMiddleware, controller.remove);
export default router;
