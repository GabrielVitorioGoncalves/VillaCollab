import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { authMiddleware } from '../middlewares/authMiddleware';
import { limiteCadastro, limiteCredenciais, limiteLoginConta, limiteLoginIp } from '../middlewares/rateLimit';

const router = Router();
const controller = new AuthController();
router.post('/register', limiteCadastro, controller.register);
router.post('/login', limiteLoginIp, limiteLoginConta, controller.login);
router.post('/logout', authMiddleware, controller.logout);
router.get('/me', authMiddleware, controller.me);
router.patch('/me', authMiddleware, controller.updateMe);
router.patch('/email', authMiddleware, limiteCredenciais, controller.changeEmail);
router.patch('/senha', authMiddleware, limiteCredenciais, controller.changePassword);
export default router;
