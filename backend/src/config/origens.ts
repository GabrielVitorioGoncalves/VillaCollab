let origens: Set<string> | null = null;

export function origensPermitidas(): Set<string> {
  if (origens) return origens;
  const producao = process.env.NODE_ENV === 'production';
  const padrao = ['https://villacollab1.onrender.com',
    ...(producao ? [] : ['http://localhost:5173', 'http://localhost:4173', 'http://127.0.0.1:5173'])];
  origens = new Set(
    (process.env.CORS_ORIGINS ?? '').split(',').map(origem => origem.trim().replace(/\/+$/, '')).filter(Boolean)
  );
  if (origens.size === 0) padrao.forEach(origem => origens!.add(origem));
  return origens;
}

export function origemConfiavel(origem: string | undefined): string | null {
  if (!origem) return null;
  const normalizada = origem.trim().replace(/\/+$/, '');
  return origensPermitidas().has(normalizada) ? normalizada : null;
}
