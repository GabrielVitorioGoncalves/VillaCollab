import express, { Router } from 'express';
import { MinhaLojaController } from '../controllers/MinhaLojaController';
import { authMiddleware } from '../middlewares/authMiddleware';
import { limiteEnvioImagem } from '../middlewares/rateLimit';

const router = Router();
const controller = new MinhaLojaController();
router.use(authMiddleware);
router.get('/', controller.loja);
router.get('/resumo', controller.resumo);
router.get('/produtos', controller.produtos);
router.get('/produtos/:id', controller.produto);
router.get('/pedidos', controller.pedidos);
router.get('/pedidos/:id', controller.pedido);
router.post('/imagens', limiteEnvioImagem,
  express.raw({ type: ['image/png', 'image/jpeg', 'image/webp'], limit: '6mb' }),
  controller.enviarImagem);
export default router;
