import express, { Router } from 'express';
import { AdminController } from '../controllers/AdminController';
import { authMiddleware } from '../middlewares/authMiddleware';

const router = Router();
const controller = new AdminController();
router.use(authMiddleware);
router.get('/me', controller.me);
router.get('/painel', controller.painel);
router.get('/lojas', controller.lojas);
router.post('/lojas', controller.criarLoja);
router.get('/lojas/:id', controller.loja);
router.patch('/lojas/:id', controller.atualizarLoja);
router.delete('/lojas/:id', controller.excluirLoja);
router.post('/lojas/:id/imagens',
  express.raw({ type: ['image/png', 'image/jpeg', 'image/webp'], limit: '6mb' }),
  controller.enviarImagemLoja);
router.get('/usuarios', controller.usuarios);
router.patch('/usuarios/:id', controller.definirPapel);
router.delete('/usuarios/:id', controller.excluirUsuario);
router.post('/administradores', controller.criarAdministrador);
export default router;
