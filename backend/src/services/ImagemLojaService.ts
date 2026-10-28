import { randomUUID } from 'node:crypto';
import { createSupabaseClient } from '../config/supabase';

export const BUCKET_LOJAS = 'lojas';
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

type Client = ReturnType<typeof createSupabaseClient>;
export type ResultadoImagem =
  | { ok: true; url: string }
  | { ok: false; status: number; erro: string };

function detectImage(buffer: Buffer): { ext: string; type: string } | null {
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return { ext: 'png', type: 'image/png' };
  }
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { ext: 'jpg', type: 'image/jpeg' };
  }
  if (buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') {
    return { ext: 'webp', type: 'image/webp' };
  }
  return null;
}

export async function enviarImagemDaLoja(client: Client, lojaId: string, tipo: string, body: unknown): Promise<ResultadoImagem> {
  if (!Buffer.isBuffer(body) || body.length === 0) {
    return { ok: false, status: 415, erro: 'Envie uma imagem PNG, JPG ou WEBP' };
  }
  if (body.length > MAX_IMAGE_BYTES) {
    return { ok: false, status: 413, erro: 'A imagem pode ter no máximo 5 MB' };
  }
  const image = detectImage(body);
  if (!image) {
    return { ok: false, status: 400, erro: 'O arquivo não é uma imagem PNG, JPG ou WEBP válida' };
  }
  const path = `${lojaId}/${tipo}/${randomUUID()}.${image.ext}`;
  const storage = client.storage.from(BUCKET_LOJAS);
  const { error } = await storage.upload(path, body, { contentType: image.type, upsert: false });
  if (error) {
    console.error('Falha ao enviar imagem para o Storage');
    return { ok: false, status: 502, erro: 'Não foi possível salvar a imagem agora' };
  }
  return { ok: true, url: storage.getPublicUrl(path).data.publicUrl };
}
