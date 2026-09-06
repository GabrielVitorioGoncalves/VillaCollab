import express from 'express';
import cors from 'cors';
import routes from './routes';
import { errorHandler } from './middlewares/erroHandler';

const app = express();

app.use(cors());
app.use(express.json());
app.use('/api/produtos', routes);

app.use(errorHandler)

export default app;