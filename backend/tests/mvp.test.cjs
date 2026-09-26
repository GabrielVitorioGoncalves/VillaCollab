const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');

const lojaA = '11111111-1111-4111-8111-111111111111';
const lojaB = '22222222-2222-4222-8222-222222222222';
const usuario = '33333333-3333-4333-8333-333333333333';
const outro = '44444444-4444-4444-8444-444444444444';
const produto = '55555555-5555-4555-8555-555555555555';
const pedido = '66666666-6666-4666-8666-666666666666';
let state;
let server;
let base;

function query(table, token) {
  const call = { table, token, filters: [] };
  state.calls.push(call);
  const builder = {
    select(columns) { call.select = columns; return this; },
    eq(key, value) { call.filters.push([key, value]); return this; },
    neq(key, value) { call.filters.push([key, `!=${value}`]); return this; },
    order(key) { call.order = key; return this; },
    limit(n) { call.limit = n; return this; },
    insert(value) { call.insert = value; return this; },
    update(value) { call.update = value; return this; },
    delete() { call.delete = true; return this; },
    maybeSingle() {
      const lookup = Object.fromEntries(call.filters);
      let data;
      if (table === 'usuarios') data = lookup.id === usuario ? state.actor : state.target;
      if (table === 'lojas') data = lookup.id === lojaA ? state.shop : null;
      if (table === 'produtos') data = lookup.id === produto ? state.product : null;
      if (table === 'pedidos') data = lookup.id === pedido || lookup.loja_id === state.order?.loja_id ? state.order : null;
      if (call.delete) data = state.deleted ? { id: lojaA } : null;
      if (call.update && data) data = { ...data, ...call.update };
      return Promise.resolve({ data, error: state.dbError });
    },
    single() { return Promise.resolve({ data: { id: lojaA, ...call.insert }, error: state.insertError }); },
    then(resolve, reject) {
      let rows = state.rows[table] ?? [];
      for (const [key, value] of call.filters) rows = rows.filter(row => row[key] === value);
      return Promise.resolve({ data: rows, error: state.dbError }).then(resolve, reject);
    }
  };
  return builder;
}

const configPath = require.resolve('../src/config/supabase');
require.cache[configPath] = {
  id: configPath, filename: configPath, loaded: true,
  exports: {
    supabase: {
      from: table => query(table),
      auth: {
        async getUser() { return { data: { user: state.authError ? null : { id: usuario } }, error: state.authError }; },
        async signUp(input) {
          state.signUp = input;
          return { data: { user: { id: usuario }, session: null }, error: state.signupError };
        },
        async signInWithPassword(input) {
          state.signIn = input;
          return { data: { user: { id: usuario }, session: { access_token: 'jwt', refresh_token: 'refresh', expires_at: 1 } }, error: state.loginError };
        }
      }
    },
    createSupabaseClient: token => ({
      from: table => query(table, token),
      async rpc(name, args) {
        state.rpc = { name, args, token };
        return { data: name === 'criar_pedido' ? pedido : null, error: state.rpcError };
      }
    })
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
  state = {
    calls: [], rows: { lojas: [{ id: lojaA, nome: 'Loja A' }], pedidos: [] },
    actor: { id: usuario, role: 'cliente', loja_id: null },
    target: { id: outro, role: 'cliente', loja_id: null },
    shop: { id: lojaA, nome: 'Loja A' }, product: { id: produto, loja_id: lojaA, estoque: 5 },
    order: { id: pedido, loja_id: lojaA, usuario_id: usuario, status: 'pendente' },
    deleted: true
  };
});
async function request(path, method = 'GET', body, auth = false) {
  const response = await fetch(base + path, {
    method, headers: { ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(auth ? { Authorization: 'Bearer jwt' } : {}) },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : null };
}

test('cadastro cria apenas cliente e não devolve senha', async () => {
  const result = await request('/api/auth/register', 'POST', { nome: ' Yuri ', email: 'yuri@example.com', password: 'segredo123' });
  assert.deepEqual(result, { status: 201, body: { id: usuario, confirmacao_email_pendente: true } });
  assert.deepEqual(state.signUp.options.data, { nome: 'Yuri' });
  assert.equal(JSON.stringify(result).includes('segredo123'), false);
});
test('cadastro não aceita role ou loja_id enviados pelo cliente', async () => {
  assert.equal((await request('/api/auth/register', 'POST', {
    nome: 'Yuri', email: 'yuri@example.com', password: 'segredo123', role: 'admin'
  })).status, 400);
  assert.equal(state.signUp, undefined);
});
test('login rejeita credenciais inválidas e retorna sessão e perfil em caso de sucesso', async () => {
  state.loginError = { message: 'wrong password' };
  assert.equal((await request('/api/auth/login', 'POST', { email: 'x@y.com', password: 'senha' })).status, 401);
  state.loginError = null;
  const result = await request('/api/auth/login', 'POST', { email: 'x@y.com', password: 'senha' });
  assert.equal(result.status, 200);
  assert.equal(result.body.access_token, 'jwt');
  assert.equal(result.body.usuario.id, usuario);
});
test('rota me exige token e retorna somente o perfil autenticado', async () => {
  assert.equal((await request('/api/auth/me')).status, 401);
  assert.equal((await request('/api/auth/me', 'GET', undefined, true)).body.id, usuario);
});
test('catálogo de lojas é público e exige UUID no detalhe', async () => {
  assert.equal((await request('/api/lojas')).body[0].id, lojaA);
  assert.equal((await request('/api/lojas/invalido')).status, 400);
});
test('somente admin cadastra loja; slug duplicado retorna conflito', async () => {
  const input = { nome: 'Nova Loja', slug: 'nova-loja' };
  assert.equal((await request('/api/lojas', 'POST', input, true)).status, 403);
  state.actor.role = 'admin';
  assert.equal((await request('/api/lojas', 'POST', input, true)).status, 201);
  state.insertError = { code: '23505' };
  assert.equal((await request('/api/lojas', 'POST', input, true)).status, 409);
});
test('lojista edita a própria loja e não outra', async () => {
  state.actor = { role: 'lojista', loja_id: lojaA };
  assert.equal((await request(`/api/lojas/${lojaA}`, 'PATCH', { nome: 'Atualizada' }, true)).status, 200);
  assert.equal((await request(`/api/lojas/${lojaB}`, 'PATCH', { nome: 'Ataque' }, true)).status, 403);
});
test('admin não exclui loja que possui pedidos', async () => {
  state.actor.role = 'admin';
  state.order = { id: pedido, loja_id: lojaA };
  assert.equal((await request(`/api/lojas/${lojaA}`, 'DELETE', undefined, true)).status, 409);
});
test('somente admin atribui lojista a uma loja existente', async () => {
  const input = { role: 'lojista', loja_id: lojaA };
  assert.equal((await request(`/api/usuarios/${outro}/vinculo`, 'PATCH', input, true)).status, 403);
  state.actor.role = 'admin';
  const result = await request(`/api/usuarios/${outro}/vinculo`, 'PATCH', input, true);
  assert.equal(result.status, 200);
  assert.equal(result.body.loja_id, lojaA);
});
test('listagem de perfis é restrita ao admin', async () => {
  assert.equal((await request('/api/usuarios', 'GET', undefined, true)).status, 403);
  state.actor.role = 'admin';
  state.rows.usuarios = [{ id: usuario, nome: 'Admin', role: 'admin' }];
  const result = await request('/api/usuarios', 'GET', undefined, true);
  assert.equal(result.status, 200);
  assert.equal(result.body.length, 1);
  assert.equal(state.calls.at(-1).select, 'id, nome, role, loja_id');
});
test('estoque não pode ser alterado por cliente ou lojista de outra loja', async () => {
  assert.equal((await request(`/api/produtos/${produto}/estoque`, 'PATCH', { estoque: 10 }, true)).status, 403);
  state.actor = { role: 'lojista', loja_id: lojaB };
  assert.equal((await request(`/api/produtos/${produto}/estoque`, 'PATCH', { estoque: 10 }, true)).status, 403);
  state.actor.loja_id = lojaA;
  assert.equal((await request(`/api/produtos/${produto}/estoque`, 'PATCH', { estoque: 10 }, true)).status, 200);
});
test('pedido usa RPC com token, sem preço, total ou usuario_id do cliente', async () => {
  const input = { loja_id: lojaA, itens: [{ produto_id: produto, quantidade: 2 }] };
  const result = await request('/api/pedidos', 'POST', input, true);
  assert.equal(result.status, 201);
  assert.deepEqual(state.rpc, { name: 'criar_pedido', args: { p_loja_id: lojaA, p_itens: input.itens }, token: 'jwt' });
  assert.equal((await request('/api/pedidos', 'POST', { ...input, total: 0 }, true)).status, 400);
  assert.equal((await request('/api/pedidos', 'POST', { ...input, itens: [...input.itens, ...input.itens] }, true)).status, 400);
});
test('pedido traduz erro de estoque sem expor mensagem do banco', async () => {
  state.rpcError = { message: 'VC_STOCK' };
  assert.deepEqual(await request('/api/pedidos', 'POST', {
    loja_id: lojaA, itens: [{ produto_id: produto, quantidade: 10 }]
  }, true), { status: 409, body: { erro: 'Estoque insuficiente' } });
});
test('somente lojista da loja lista pedidos dela', async () => {
  assert.equal((await request(`/api/pedidos/loja/${lojaA}`, 'GET', undefined, true)).status, 403);
  state.actor = { role: 'lojista', loja_id: lojaA };
  assert.equal((await request(`/api/pedidos/loja/${lojaA}`, 'GET', undefined, true)).status, 200);
  assert.equal((await request(`/api/pedidos/loja/${lojaB}`, 'GET', undefined, true)).status, 403);
});
test('transição inválida do pedido retorna conflito', async () => {
  state.rpcError = { message: 'VC_CONFLICT' };
  assert.equal((await request(`/api/pedidos/${pedido}/status`, 'PATCH', { status: 'concluido' }, true)).status, 409);
  assert.equal((await request(`/api/pedidos/${pedido}/status`, 'PATCH', { status: 'pago' }, true)).status, 400);
});
