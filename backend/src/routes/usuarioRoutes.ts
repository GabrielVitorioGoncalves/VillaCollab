import { Router } from 'express';
import { UsuarioController } from '../controllers/UsuarioController';
import { authMiddleware } from '../middlewares/authMiddleware';

const router = Router();
const controller = new UsuarioController();
router.use(authMiddleware);
router.get('/', controller.list);
router.patch('/:id/vinculo', controller.assignStore);
export default router;
