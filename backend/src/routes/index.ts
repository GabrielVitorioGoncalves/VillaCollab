import { Router } from 'express';
import { checkHealth } from '../controllers/healthController';
import produtoRoutes from './produtoRoutes';

const routes = Router();

routes.get('/health', checkHealth);
routes.use('/produtos', produtoRoutes);

export default routes;
