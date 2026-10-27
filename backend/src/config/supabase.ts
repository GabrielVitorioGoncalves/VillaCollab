import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Configure SUPABASE_URL e SUPABASE_ANON_KEY antes de iniciar a API');
}

export function createSupabaseClient(accessToken?: string) {
  return createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    ...(accessToken ? { global: { headers: { Authorization: `Bearer ${accessToken}` } } } : {})
  });
}

export const supabase = createSupabaseClient();

// Atualiza e-mail ou senha do próprio usuário direto no Supabase Auth, usando só o token
// de acesso (o cliente JS exige uma sessão completa para isso).
export async function updateAuthUser(accessToken: string, attributes: { email?: string; password?: string }) {
  const response = await fetch(`${supabaseUrl.replace(/\/+$/, '')}/auth/v1/user`, {
    method: 'PUT',
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(attributes)
  });
  return { ok: response.ok, status: response.status };
}
