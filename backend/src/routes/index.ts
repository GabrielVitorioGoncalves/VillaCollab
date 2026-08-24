import { Router } from 'express';
import { checkHealth } from '../controllers/healthController';

const routes = Router();

routes.get('/health', checkHealth);

export default routes;