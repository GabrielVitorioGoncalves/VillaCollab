const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');

const usuario = '33333333-3333-4333-8333-333333333333';
const lojaA = '11111111-1111-4111-8111-111111111111';
const produto = '55555555-5555-4555-8555-555555555555';
const fatorId = '77777777-7777-4777-8777-777777777777';
const tokenCom = (aal) => `cabecalho.${Buffer.from(JSON.stringify({ aal })).toString('base64url')}.assinatura`;
const AAL1 = tokenCom('aal1');
const AAL2 = tokenCom('aal2');
let state;
let server;
let base;

function query(table, token) {
  const call = { table, token, filters: {} };
  state.queries.push(call);
  return {
    select(_colunas, opcoes) { call.opcoes = opcoes; return this; },
    eq(key, value) { call.filters[key] = value; return this; },
    order() { return this; },
    range(inicio, fim) { call.range = [inicio, fim]; return this; },
    maybeSingle() {
      if (table === 'usuarios') return Promise.resolve({ data: state.perfil, error: null });
      if (table === 'produtos') return Promise.resolve({ data: { id: produto, nome: 'Caneca' }, error: null });
      return Promise.resolve({ data: null, error: null });
    },
    then(resolve, reject) {
      return Promise.resolve({ data: [{ id: 'p1' }], error: null, count: 42 }).then(resolve, reject);
    }
  };
}

const configPath = require.resolve('../src/config/supabase');
require.cache[configPath] = {
  id: configPath, filename: configPath, loaded: true,
  exports: {
    supabase: {
      from: table => query(table, null),
      auth: {
        async getUser() {
          return { data: { user: {
            id: state.usuarioId ?? usuario, email: 'maria@teste.com',
            app_metadata: { trocar_senha: state.trocarSenha },
            factors: state.fatoresVerificados ? [{ id: fatorId, factor_type: 'totp', status: 'verified' }] : []
          } }, error: null };
        }
      }
    },
    createSupabaseClient: token => ({
      auth: {
        async signInWithPassword(input) {
          state.logins.push(input);
          if (input.password !== 'senha-certa') return { data: { session: null, user: null }, error: { message: 'invalid' } };
          return { data: {
            session: { access_token: AAL1, refresh_token: 'r', expires_at: 1 },
            user: { id: usuario, email: input.email, app_metadata: { trocar_senha: state.trocarSenha },
              factors: state.fatoresVerificados ? [{ id: fatorId, status: 'verified' }] : [] }
          }, error: null };
        }
      },
      from: table => query(table, token),
      async rpc(name, args) {
        state.rpcs.push({ name, args, token });
        if (state.rpcErro) return { data: null, error: { message: state.rpcErro } };
        return { data: name === 'anonimizar_minha_conta' ? state.tinhaPedidos : 'pedido-1', error: null };
      }
    }),
    createServiceClient: () => (state.semServico ? null : {
      auth: { admin: {
        async updateUserById(id, attrs) { state.servico.push({ acao: 'atualizar', id, attrs }); return { error: null }; },
        async deleteUser(id) { state.servico.push({ acao: 'apagar', id }); return { error: null }; }
      } }
    }),
    async signOutSession() { return { ok: true, status: 204 }; },
    async updateAuthUser() { return { ok: true, status: 200 }; },
    async requisicaoAuth(token, method, caminho, corpo) {
      state.auth.push({ method, caminho, corpo });
      if (method === 'GET' && caminho === '/user') return { ok: true, status: 200, dados: { factors: state.fatores } };
      if (method === 'POST' && caminho === '/factors') return { ok: true, status: 200, dados: { id: fatorId, totp: { qr_code: '<svg/>', secret: 'SEGREDO' } } };
      if (caminho.endsWith('/challenge')) return { ok: true, status: 200, dados: { id: 'desafio' } };
      if (caminho.endsWith('/verify')) {
        return corpo.code === '123456'
          ? { ok: true, status: 200, dados: { access_token: AAL2, refresh_token: 'r2', expires_at: 2 } }
          : { ok: false, status: 422, dados: { error_code: 'mfa_verification_failed' } };
      }
      return { ok: true, status: 204, dados: null };
    }
  }
};
const fetchReal = globalThis.fetch;
globalThis.fetch = async (url, opcoes) => {
  if (String(url).startsWith('https://challenges.cloudflare.com/')) {
    state.captchas.push(String(opcoes.body));
    return new Response(JSON.stringify({ success: String(opcoes.body).includes('response=bom') }));
  }
  return fetchReal(url, opcoes);
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
  globalThis.fetch = fetchReal;
  delete process.env.TURNSTILE_SECRET_KEY;
});
beforeEach(() => {
  delete process.env.TURNSTILE_SECRET_KEY;
  state = {
    perfil: { id: usuario, nome: 'Maria', role: 'cliente', loja_id: null, admin_permissoes: null },
    trocarSenha: false, fatoresVerificados: false, fatores: [], semServico: false, tinhaPedidos: true,
    rpcErro: null, queries: [], rpcs: [], servico: [], auth: [], logins: [], captchas: []
  };
});

async function request(path, { method = 'GET', body, token = AAL1 } = {}) {
  const response = await fetch(base + path, {
    method,
    headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : null };
}

test('admin sem MFA não usa o painel e recebe o motivo certo', async () => {
  state.perfil = { ...state.perfil, role: 'admin' };
  const semCadastro = await request('/api/admin/me');
  assert.equal(semCadastro.status, 403);
  assert.equal(semCadastro.body.codigo, 'mfa_cadastro');
  state.fatoresVerificados = true;
  assert.equal((await request('/api/admin/me')).body.codigo, 'mfa_necessario');
  assert.equal((await request('/api/admin/me', { token: AAL2 })).status, 200);
  assert.equal((await request('/api/lojas', { method: 'POST', body: { nome: 'Nova', slug: 'nova', telefone: '(47) 99999-0000' } })).status, 403);
});

test('login avisa quando falta MFA ou troca de senha', async () => {
  state.perfil = { ...state.perfil, role: 'admin' };
  let r = await request('/api/auth/login', { method: 'POST', token: null, body: { email: 'adm@teste.com', password: 'senha-certa' } });
  assert.deepEqual(r.body.mfa, { necessario: false, cadastro_necessario: true });
  assert.equal(r.body.usuario.trocar_senha, false);
  state.fatoresVerificados = true;
  state.trocarSenha = true;
  r = await request('/api/auth/login', { method: 'POST', token: null, body: { email: 'adm@teste.com', password: 'senha-certa' } });
  assert.deepEqual(r.body.mfa, { necessario: true, cadastro_necessario: false });
  assert.equal(r.body.usuario.trocar_senha, true);
});

test('cadastro do MFA troca o fator pendente e a verificação devolve sessão aal2', async () => {
  state.fatores = [{ id: 'pendente', factor_type: 'totp', status: 'unverified' }];
  const cadastro = await request('/api/auth/mfa/cadastro', { method: 'POST' });
  assert.equal(cadastro.status, 201);
  assert.deepEqual(cadastro.body, { fator_id: fatorId, qr_code: 'data:image/svg+xml;utf-8,%3Csvg%2F%3E', segredo: 'SEGREDO' });
  assert.ok(state.auth.some(item => item.method === 'DELETE' && item.caminho === '/factors/pendente'));
  state.fatores = [{ id: fatorId, factor_type: 'totp', status: 'unverified' }];
  assert.equal((await request('/api/auth/mfa/verificar', { method: 'POST', body: { fator_id: fatorId, codigo: '000000' } })).status, 400);
  assert.equal((await request('/api/auth/mfa/verificar', { method: 'POST', body: { fator_id: fatorId, codigo: '12a456' } })).status, 400);
  const ok = await request('/api/auth/mfa/verificar', { method: 'POST', body: { fator_id: fatorId, codigo: '123456' } });
  assert.equal(ok.status, 200);
  assert.equal(ok.body.access_token, AAL2);
  assert.equal((await request('/api/auth/mfa/verificar', { method: 'POST', body: { fator_id: '88888888-8888-4888-8888-888888888888', codigo: '123456' } })).status, 404);
  state.fatores = [{ id: fatorId, factor_type: 'totp', status: 'verified' }];
  assert.equal((await request('/api/auth/mfa/cadastro', { method: 'POST' })).status, 409);
});

test('conta com senha provisória só troca a senha, e a troca libera a conta', async () => {
  state.trocarSenha = true;
  const bloqueado = await request('/api/pedidos/meus');
  assert.equal(bloqueado.status, 403);
  assert.equal(bloqueado.body.codigo, 'troca_de_senha');
  assert.equal((await request('/api/auth/me')).status, 200);
  assert.equal((await request('/api/auth/senha', { method: 'PATCH', body: { senha_atual: 'senha-certa', nova_senha: 'novasenha123' } })).status, 204);
  assert.deepEqual(state.servico, [{ acao: 'atualizar', id: usuario, attrs: { app_metadata: { trocar_senha: false } } }]);
  state.trocarSenha = false;
  assert.equal((await request('/api/pedidos/meus')).status, 200);
});

test('CAPTCHA: sem segredo passa direto; com segredo exige token válido', async () => {
  const body = { email: 'maria@teste.com', password: 'senha-certa' };
  assert.equal((await request('/api/auth/login', { method: 'POST', token: null, body: { ...body, captcha_token: 'qualquer' } })).status, 200);
  process.env.TURNSTILE_SECRET_KEY = 'segredo';
  assert.equal((await request('/api/auth/login', { method: 'POST', token: null, body })).status, 400);
  assert.equal((await request('/api/auth/login', { method: 'POST', token: null, body: { ...body, captcha_token: 'ruim' } })).status, 400);
  assert.equal((await request('/api/auth/login', { method: 'POST', token: null, body: { ...body, captcha_token: 'bom' } })).status, 200);
  assert.equal((await request('/api/auth/register', { method: 'POST', token: null, body: { nome: 'Ana', email: 'ana@teste.com', password: 'senha12345' } })).status, 400);
  assert.equal(state.logins.length, 2);
});

test('excluir conta: exige senha, respeita os bloqueios e anonimiza ou apaga', async () => {
  state.usuarioId = '99999999-9999-4999-8999-999999999999';
  state.semServico = true;
  assert.equal((await request('/api/auth/me', { method: 'DELETE', body: { senha_atual: 'senha-certa' } })).status, 503);
  state.semServico = false;
  assert.equal((await request('/api/auth/me', { method: 'DELETE', body: { senha_atual: 'errada' } })).status, 400);
  state.rpcErro = 'VC_CONFLICT: pedidos';
  assert.equal((await request('/api/auth/me', { method: 'DELETE', body: { senha_atual: 'senha-certa' } })).status, 409);
  state.rpcErro = 'VC_FORBIDDEN: lojista';
  assert.equal((await request('/api/auth/me', { method: 'DELETE', body: { senha_atual: 'senha-certa' } })).status, 403);
  state.rpcErro = null;
  assert.equal((await request('/api/auth/me', { method: 'DELETE', body: { senha_atual: 'senha-certa' } })).status, 204);
  const banida = state.servico.pop();
  assert.equal(banida.acao, 'atualizar');
  assert.equal(banida.attrs.ban_duration, '876000h');
  assert.match(banida.attrs.email, /@conta-removida\.invalid$/);
  state.tinhaPedidos = false;
  assert.equal((await request('/api/auth/me', { method: 'DELETE', body: { senha_atual: 'senha-certa' } })).status, 204);
  assert.deepEqual(state.servico.pop(), { acao: 'apagar', id: state.usuarioId });
});

test('meus pedidos paginados devolvem itens e total', async () => {
  const r = await request('/api/pedidos/meus?pagina=3&por_pagina=5');
  assert.deepEqual(r.body, { itens: [{ id: 'p1' }], total: 42, pagina: 3, por_pagina: 5 });
  assert.deepEqual(state.queries.at(-1).range, [10, 14]);
  assert.equal((await request('/api/pedidos/meus?pagina=1&por_pagina=500')).status, 400);
  assert.ok(Array.isArray((await request('/api/pedidos/meus')).body));
});

test('lojista não compra na própria loja', async () => {
  state.rpcErro = 'VC_FORBIDDEN: propria';
  const r = await request('/api/pedidos', { method: 'POST', body: { loja_id: lojaA, itens: [{ produto_id: produto, quantidade: 1 }], forma_pagamento: 'whatsapp' } });
  assert.equal(r.status, 403);
  assert.match(r.body.erro, /própria loja/);
});

test('produto e loja usam a sessão quando existe, para o comprador ver itens inativos do pedido', async () => {
  await request(`/api/produtos/${produto}`);
  assert.equal(state.queries.at(-1).token, AAL1);
  await request(`/api/produtos/${produto}`, { token: null });
  assert.equal(state.queries.at(-1).token, null);
});
