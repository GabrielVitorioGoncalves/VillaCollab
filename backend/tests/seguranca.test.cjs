const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');

const usuario = '33333333-3333-4333-8333-333333333333';
const lojaA = '11111111-1111-4111-8111-111111111111';
const produto = '55555555-5555-4555-8555-555555555555';
const TOKEN = `cabecalho.${Buffer.from(JSON.stringify({ aal: 'aal2' })).toString('base64url')}.assinatura`;
let state;
let server;
let base;

function query() {
  return {
    select() { return this; },
    eq() { return this; },
    limit() { return this; },
    insert() { return this; },
    maybeSingle() { return Promise.resolve({ data: state.perfil, error: null }); },
    single() { return Promise.resolve({ data: { id: lojaA }, error: null }); }
  };
}

const configPath = require.resolve('../src/config/supabase');
require.cache[configPath] = {
  id: configPath, filename: configPath, loaded: true,
  exports: {
    supabase: {
      from: () => query(),
      auth: { async getUser() { return { data: { user: { id: usuario, email: 'maria@teste.com' } }, error: null }; } }
    },
    createSupabaseClient: () => ({
      auth: {
        async signInWithPassword() { state.logins += 1; return { data: { session: null, user: null }, error: { message: 'invalid' } }; }
      },
      from: () => query(),
      async rpc(name) { state.rpc = name; return { data: null, error: state.rpcError }; }
    }),
    async signOutSession() { return { ok: true, status: 204 }; },
    async updateAuthUser() { return { ok: true, status: 200 }; }
  }
};
const app = require('../src/app').default;

before(async () => {
  server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  server.closeAllConnections();
  await new Promise(resolve => server.close(resolve));
  delete require.cache[configPath];
});
beforeEach(() => {
  state = { perfil: { role: 'cliente', loja_id: null, admin_permissoes: null }, rpcError: null, logins: 0 };
});

async function request(path, { method = 'GET', body, headers = {} } = {}) {
  const response = await fetch(base + path, {
    method,
    headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), Authorization: `Bearer ${TOKEN}`, ...headers },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await response.text();
  return { status: response.status, headers: response.headers, body: text ? JSON.parse(text) : null };
}

test('respostas trazem cabeçalhos de segurança e não revelam o Express', async () => {
  const { headers } = await request('/api/lojas');
  assert.equal(headers.get('x-powered-by'), null);
  assert.equal(headers.get('x-content-type-options'), 'nosniff');
  assert.equal(headers.get('x-frame-options'), 'DENY');
  assert.equal(headers.get('cache-control'), 'no-store');
  assert.match(headers.get('content-security-policy'), /frame-ancestors 'none'/);
});

test('CORS só libera origens conhecidas', async () => {
  const conhecida = await request('/api/lojas', { headers: { Origin: 'http://localhost:5173' } });
  assert.equal(conhecida.headers.get('access-control-allow-origin'), 'http://localhost:5173');
  const preflight = await fetch(`${base}/api/pedidos`, { method: 'OPTIONS', headers: {
    Origin: 'http://localhost:5173', 'Access-Control-Request-Method': 'POST',
    'Access-Control-Request-Headers': 'authorization,content-type,idempotency-key' } });
  assert.match(preflight.headers.get('access-control-allow-headers'), /Idempotency-Key/);
  const estranha = await request('/api/lojas', { headers: { Origin: 'https://site-malicioso.example' } });
  assert.equal(estranha.headers.get('access-control-allow-origin'), null);
});

test('muitas tentativas de login para a mesma conta respondem 429', async () => {
  const body = { email: 'alvo@teste.com', password: 'chute' };
  for (let i = 0; i < 10; i += 1) {
    assert.equal((await request('/api/auth/login', { method: 'POST', body })).status, 401);
  }
  const bloqueada = await request('/api/auth/login', { method: 'POST', body });
  assert.equal(bloqueada.status, 429);
  assert.ok(Number(bloqueada.headers.get('retry-after')) > 0);
  assert.equal(state.logins, 10);
  const outraConta = await request('/api/auth/login', { method: 'POST', body: { ...body, email: 'outra@teste.com' } });
  assert.equal(outraConta.status, 401);
  const outraRede = await request('/api/auth/login', { method: 'POST', body, headers: { 'CF-Connecting-IP': '203.0.113.7' } });
  assert.equal(outraRede.status, 401);
});

test('limite de pedidos pendentes do banco vira 429', async () => {
  state.rpcError = { message: 'VC_LIMIT' };
  const r = await request('/api/pedidos', { method: 'POST', body: { loja_id: lojaA, itens: [{ produto_id: produto, quantidade: 1 }] } });
  assert.equal(r.status, 429);
  assert.match(r.body.erro, /aguardando confirmação/);
});

test('admin sem a permissão de lojas não cria, edita nem exclui loja pela rota antiga', async () => {
  state.perfil = { role: 'admin', loja_id: null, admin_permissoes: ['usuarios'] };
  assert.equal((await request('/api/lojas', { method: 'POST', body: { nome: 'Nova', slug: 'nova', telefone: '(47) 99999-0000' } })).status, 403);
  assert.equal((await request(`/api/lojas/${lojaA}`, { method: 'PATCH', body: { nome: 'Outra' } })).status, 403);
  assert.equal((await request(`/api/lojas/${lojaA}`, { method: 'DELETE' })).status, 403);
  state.perfil = { role: 'admin', loja_id: null, admin_permissoes: ['lojas'] };
  assert.equal((await request('/api/lojas', { method: 'POST', body: { nome: 'Nova', slug: 'nova', telefone: '(47) 99999-0000' } })).status, 201);
});

test('descrição de produto acima de 5000 caracteres é recusada', async () => {
  state.perfil = { role: 'lojista', loja_id: lojaA, admin_permissoes: null };
  const r = await request('/api/produtos', { method: 'POST', body: { nome: 'Produto', preco: 10, estoque: 1, loja_id: lojaA, descricao: 'a'.repeat(5001) } });
  assert.equal(r.status, 400);
  assert.ok(r.body.detalhes.descricao);
});
