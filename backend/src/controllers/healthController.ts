import { Request, Response } from 'express';
import { supabase } from '../config/supabase';

export const checkHealth = async (_req: Request, res: Response): Promise<void> => {
  try {
    // Validação de consulta na tabela de lojas do Supabase
    const { error } = await supabase.from('lojas').select('id').limit(1);

    res.status(200).json({
      status: 'ok',
      service: 'Villa Collab API',
      timestamp: new Date().toISOString(),
      database: error ? `Supabase conectado (aviso: ${error.message})` : 'Supabase conectado com sucesso'
    });
  } catch (err: any) {
    res.status(500).json({
      status: 'error',
      message: 'Erro interno ao consultar serviço',
      error: err.message
    });
  }
};