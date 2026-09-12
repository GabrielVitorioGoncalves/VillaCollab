import { Request, Response } from 'express';
import { supabase } from '../config/supabase';

export const checkHealth = async (_req: Request, res: Response): Promise<void> => {
  try {
    // Validação de consulta na tabela de lojas do Supabase
    const { error } = await supabase.from('lojas').select('id').limit(1);

    res.status(error ? 503 : 200).json({
      status: error ? 'error' : 'ok',
      service: 'Villa Collab API',
      timestamp: new Date().toISOString(),
      database: error ? 'unavailable' : 'available'
    });
  } catch {
    res.status(503).json({
      status: 'error',
      service: 'Villa Collab API',
      timestamp: new Date().toISOString(),
      database: 'unavailable'
    });
  }
};
