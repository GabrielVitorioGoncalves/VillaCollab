import express from 'express';
import cors from 'cors';
import routes from './routes';
import { errorHandler } from './middlewares/erroHandler';
import { limiteGeral } from './middlewares/rateLimit';

const producao = process.env.NODE_ENV === 'production';
const origensPadrao = ['https://villacollab1.onrender.com',
  ...(producao ? [] : ['http://localhost:5173', 'http://localhost:4173', 'http://127.0.0.1:5173'])];
const origensPermitidas = new Set(
  (process.env.CORS_ORIGINS ?? '').split(',').map(origem => origem.trim().replace(/\/+$/, '')).filter(Boolean)
);
if (origensPermitidas.size === 0) origensPadrao.forEach(origem => origensPermitidas.add(origem));

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', Number(process.env.TRUST_PROXY ?? 1));
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
  res.setHeader('Cache-Control', 'no-store');
  if (req.secure) res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
});
app.use(cors({
  origin: (origin, callback) => callback(null, !origin || origensPermitidas.has(origin)),
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key'],
  maxAge: 600
}));
app.use(limiteGeral);
app.use(express.json({ limit: '100kb' }));
app.use('/api', routes);
app.use(errorHandler);

export default app;
