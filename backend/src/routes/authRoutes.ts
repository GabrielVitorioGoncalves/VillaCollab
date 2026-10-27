import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { authMiddleware } from '../middlewares/authMiddleware';

const router = Router();
const controller = new AuthController();
router.post('/register', controller.register);
router.post('/login', controller.login);
router.get('/me', authMiddleware, controller.me);
router.patch('/me', authMiddleware, controller.updateMe);
router.patch('/email', authMiddleware, controller.changeEmail);
router.patch('/senha', authMiddleware, controller.changePassword);
export default router;
