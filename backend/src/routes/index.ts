import { Router } from 'express';
import { checkHealth } from '../controllers/healthController';
import produtoRoutes from './produtoRoutes';
import authRoutes from './authRoutes';
import lojaRoutes from './lojaRoutes';
import pedidoRoutes from './pedidoRoutes';
import usuarioRoutes from './usuarioRoutes';
import carrinhoRoutes from './carrinhoRoutes';
import minhaLojaRoutes from './minhaLojaRoutes';
import adminRoutes from './adminRoutes';

const routes = Router();

routes.get('/health', checkHealth);
routes.use('/auth', authRoutes);
routes.use('/lojas', lojaRoutes);
routes.use('/produtos', produtoRoutes);
routes.use('/pedidos', pedidoRoutes);
routes.use('/usuarios', usuarioRoutes);
routes.use('/carrinho', carrinhoRoutes);
routes.use('/minha-loja', minhaLojaRoutes);
routes.use('/admin', adminRoutes);

export default routes;
