import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { authMiddleware } from '../middlewares/authMiddleware';
import {
  limiteCadastro, limiteCredenciais, limiteLoginConta, limiteLoginEmail, limiteLoginIp, limiteRecuperacaoConta,
  limiteRecuperacaoIp
} from '../middlewares/rateLimit';
import { exigirCaptcha } from '../middlewares/captcha';

const router = Router();
const controller = new AuthController();
router.post('/register', limiteCadastro, exigirCaptcha, controller.register);
router.post('/login', limiteLoginIp, exigirCaptcha, limiteLoginConta, limiteLoginEmail, controller.login);
router.post('/logout', authMiddleware, controller.logout);
router.get('/me', authMiddleware, controller.me);
router.patch('/me', authMiddleware, controller.updateMe);
router.delete('/me', authMiddleware, limiteCredenciais, controller.excluirConta);
router.get('/mfa', authMiddleware, controller.mfaStatus);
router.post('/mfa/cadastro', authMiddleware, limiteCredenciais, controller.mfaCadastro);
router.post('/mfa/verificar', authMiddleware, limiteCredenciais, controller.mfaVerificar);
router.patch('/email', authMiddleware, limiteCredenciais, controller.changeEmail);
router.patch('/senha', authMiddleware, limiteCredenciais, controller.changePassword);
router.post('/senha/recuperar', limiteRecuperacaoIp, exigirCaptcha, limiteRecuperacaoConta, controller.recuperarSenha);
router.post('/senha/redefinir', authMiddleware, limiteCredenciais, controller.redefinirSenha);
export default router;
