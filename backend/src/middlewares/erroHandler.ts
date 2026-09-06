import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export function errorHandler(
  err: any, 
  req: Request, 
  res: Response, 
  next: NextFunction
): void {
  if (err instanceof ZodError) {
    res.status(400).json({
      erro: 'Dados inválidos',
      detalhes: err.flatten().fieldErrors 
    });
    return;
  }
  if (err instanceof SyntaxError && err && 'type' in err && err.type === 'entity.parse.failed') {
    res.status(400).json({ erro: 'JSON inválido' });
    return;
  }
  // Não registrar o objeto original: pode conter body, tokens ou detalhes do provedor.
  console.error('Erro interno ao processar requisição');

  res.status(500).json({ erro: 'Erro interno no servidor' });
}
