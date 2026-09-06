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
  console.error(err);

  res.status(500).json({ erro: 'Erro interno no servidor' });
}