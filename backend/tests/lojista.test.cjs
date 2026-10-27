const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');

const lojaA = '11111111-1111-4111-8111-111111111111';
const lojaB = '22222222-2222-4222-8222-222222222222';
const lojista = '33333333-3333-4333-8333-333333333333';
const cliente = '44444444-4444-4444-8444-444444444444';
const produtoA = '55555555-5555-4555-8555-555555555555';
const pedidoA = '66666666-6666-4666-8666-666666666666';
const pedidoB = '77777777-7777-4777-8777-777777777777';
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
let state;
let server;
let base;

function query(table) {
  const call = { table, filters: [] };
  state.calls.push(call);
  const matches = (row) => call.filters.every(([key, value]) => row[key] === value);
  return {
    select(columns) { call.select = columns; return this; },
    eq(key, value) { call.filters.push([key, value]); return this; },
    order(key) { call.order = key; return this; },
    update(value) { call.update = value; return this; },
    maybeSingle() {
      if (table === 'usuarios') return Promise.resolve({ data: state.perfil, error: null });
      if (call.update) {
        const row = (state.rows[table] ?? []).find(matches);
        return Promise.resolve({ data: row ? { ...row, ...call.update } : null, error: null });
      }
      return Promise.resolve({ data: (state.rows[table] ?? []).find(matches) ?? null, error: null });
    },
    then(resolve, reject) {
      return Promise.resolve({ data: (state.rows[table] ?? []).filter(matches), error: null }).then(resolve, reject);
    }
  };
}

const configPath = require.resolve('../src/config/supabase');
require.cache[configPath] = {
  id: configPath, filename: configPath, loaded: true,
  exports: {
    supabase: {
      from: table => query(table),
      auth: { async getUser(token) {
        return token === 'sem-perfil' ? { data: { user: null }, error: { message: 'x' } }
          : { data: { user: { id: state.perfilId, email: 'x@y.com' } }, error: null };
      } }
    },
    createSupabaseClient: () => ({
      from: table => query(table),
      async rpc(name, args) {
        state.rpcCalls.push({ name, args });
        if (name === 'clientes_da_loja') {
          return { data: [{ usuario_id: cliente, nome: 'Maria', telefone: '47 9999', email: 'maria@x.com' }], error: null };
        }
        return { data: name === 'criar_pedido' ? pedidoA : null, error: state.rpcError ?? null };
      },
      storage: { from(bucket) {
        return {
          async upload(path, body, options) { state.upload = { bucket, path, size: body.length, options }; return { error: state.uploadError ?? null }; },
          getPublicUrl(path) { return { data: { publicUrl: `https://cdn.local/${bucket}/${path}` } }; }
        };
      } }
    }),
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
  state = {
    calls: [], rpcCalls: [], perfilId: lojista,
    perfil: { role: 'lojista', loja_id: lojaA },
    rows: {
      lojas: [{ id: lojaA, nome: 'Loja A', notificacoes: { email: true } }, { id: lojaB, nome: 'Loja B' }],
      produtos: [
        { id: produtoA, loja_id: lojaA, nome: 'Caneca', ativo: true },
        { id: 'p2', loja_id: lojaA, nome: 'Inativo', ativo: false },
        { id: 'p3', loja_id: lojaB, nome: 'Da outra loja', ativo: true }
      ],
      pedidos: [
        { id: pedidoA, loja_id: lojaA, usuario_id: cliente, status: 'pendente', total: 10 },
        { id: pedidoB, loja_id: lojaB, usuario_id: cliente, status: 'pendente', total: 20 }
      ]
    }
  };
});

async function request(path, { method = 'GET', body, token = 'jwt', type } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = type ?? 'application/json';
  const response = await fetch(base + path, {
    method, headers,
    body: body === undefined ? undefined : Buffer.isBuffer(body) ? body : JSON.stringify(body)
  });
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : null };
}

test('área do lojista exige login e perfil de lojista com loja', async () => {
  assert.equal((await request('/api/minha-loja', { token: null })).status, 401);
  state.perfil = { role: 'cliente', loja_id: null };
  assert.deepEqual(await request('/api/minha-loja'), { status: 403, body: { erro: 'Acesso restrito a lojistas' } });
  state.perfil = { role: 'admin', loja_id: null };
  assert.equal((await request('/api/minha-loja/pedidos')).status, 403);
  state.perfil = { role: 'lojista', loja_id: null };
  assert.equal((await request('/api/minha-loja/produtos')).status, 403);
});

test('a loja vem do perfil, não de parâmetro enviado pelo front', async () => {
  const result = await request(`/api/minha-loja?loja_id=${lojaB}`);
  assert.equal(result.status, 200);
  assert.equal(result.body.id, lojaA);
  assert.deepEqual(result.body.notificacoes, { email: true });
});

test('lojista lista todos os produtos da própria loja, inclusive inativos, e nenhum de outra', async () => {
  const result = await request(`/api/minha-loja/produtos?loja_id=${lojaB}`);
  assert.deepEqual(result.body.map(p => p.nome).sort(), ['Caneca', 'Inativo']);
  assert.equal((await request('/api/minha-loja/produtos/p3')).status, 400);
  state.rows.produtos[2].id = '88888888-8888-4888-8888-888888888888';
  assert.equal((await request('/api/minha-loja/produtos/88888888-8888-4888-8888-888888888888')).status, 404);
});

test('vitrine pública não mostra produtos inativos', async () => {
  const result = await request(`/api/produtos/loja/${lojaA}`, { token: null });
  assert.deepEqual(result.body.map(p => p.nome), ['Caneca']);
});

test('pedidos da loja vêm com dados do cliente e só da própria loja', async () => {
  const result = await request('/api/minha-loja/pedidos');
  assert.equal(result.status, 200);
  assert.deepEqual(result.body.map(p => p.id), [pedidoA]);
  assert.deepEqual(result.body[0].cliente, { nome: 'Maria', telefone: '47 9999', email: 'maria@x.com' });
  assert.deepEqual(state.rpcCalls.find(c => c.name === 'clientes_da_loja').args, { p_loja_id: lojaA });
  assert.equal((await request(`/api/minha-loja/pedidos/${pedidoA}`)).body.cliente.nome, 'Maria');
  assert.deepEqual(await request(`/api/minha-loja/pedidos/${pedidoB}`), { status: 404, body: { erro: 'Pedido não encontrado' } });
});

test('status enviado passa pela função do banco; status desconhecido é recusado', async () => {
  assert.equal((await request(`/api/pedidos/${pedidoA}/status`, { method: 'PATCH', body: { status: 'enviado' } })).status, 200);
  assert.deepEqual(state.rpcCalls.at(-1), { name: 'atualizar_status_pedido', args: { p_pedido_id: pedidoA, p_status: 'enviado' } });
  assert.equal((await request(`/api/pedidos/${pedidoA}/status`, { method: 'PATCH', body: { status: 'entregue' } })).status, 400);
  state.rpcError = { message: 'VC_CONFLICT' };
  assert.equal((await request(`/api/pedidos/${pedidoA}/status`, { method: 'PATCH', body: { status: 'enviado' } })).status, 409);
});

test('regras da loja viram respostas claras na criação do pedido', async () => {
  const input = { loja_id: lojaA, itens: [{ produto_id: produtoA, quantidade: 1 }] };
  for (const [code, erro] of [
    ['VC_CLOSED', 'Esta loja não está recebendo pedidos no momento'],
    ['VC_MINIMUM', 'O pedido não atinge o valor mínimo da loja'],
    ['VC_INACTIVE', 'Produto indisponível']
  ]) {
    state.rpcError = { message: code };
    assert.deepEqual(await request('/api/pedidos', { method: 'POST', body: input }), { status: 409, body: { erro } });
  }
});

test('chave de idempotência vai para a função; chave inválida é recusada', async () => {
  const input = { loja_id: lojaA, itens: [{ produto_id: produtoA, quantidade: 1 }] };
  const chave = '99999999-9999-4999-8999-999999999999';
  const ok = await fetch(base + '/api/pedidos', {
    method: 'POST', headers: { Authorization: 'Bearer jwt', 'Content-Type': 'application/json', 'Idempotency-Key': chave },
    body: JSON.stringify(input)
  });
  assert.equal(ok.status, 201);
  assert.equal(state.rpcCalls.find(c => c.name === 'criar_pedido').args.p_chave, chave);
  const bad = await fetch(base + '/api/pedidos', {
    method: 'POST', headers: { Authorization: 'Bearer jwt', 'Content-Type': 'application/json', 'Idempotency-Key': 'abc' },
    body: JSON.stringify(input)
  });
  assert.equal(bad.status, 400);
});

test('lojista edita configurações da própria loja com validação', async () => {
  const ok = await request(`/api/lojas/${lojaA}`, { method: 'PATCH', body: {
    aceita_pedidos: false, pedido_minimo: 30.5, prazo_preparo_dias: 2, email_contato: 'contato@loja.com',
    telefone: '(47) 3333-0000', notificacoes: { email: true, pedidos: false, estoque_baixo: true }
  } });
  assert.equal(ok.status, 200);
  assert.equal(ok.body.pedido_minimo, 30.5);
  for (const body of [
    { pedido_minimo: -1 }, { pedido_minimo: 1.234 }, { prazo_preparo_dias: 400 }, { email_contato: 'x' },
    { notificacoes: { email: true } }, { nota_media: 5 }, { total_avaliacoes: 10 }
  ]) {
    assert.equal((await request(`/api/lojas/${lojaA}`, { method: 'PATCH', body })).status, 400, JSON.stringify(body));
  }
  assert.equal((await request(`/api/lojas/${lojaB}`, { method: 'PATCH', body: { aceita_pedidos: false } })).status, 403);
});

test('upload de imagem: só lojista, só imagem de verdade, gravada na pasta da própria loja', async () => {
  const ok = await request('/api/minha-loja/imagens?tipo=produto', { method: 'POST', body: PNG, type: 'image/png' });
  assert.equal(ok.status, 201);
  assert.match(state.upload.path, new RegExp(`^${lojaA}/produto/[0-9a-f-]+\\.png$`));
  assert.equal(state.upload.bucket, 'lojas');
  assert.equal(ok.body.url, `https://cdn.local/lojas/${state.upload.path}`);

  state.upload = undefined;
  const falso = await request('/api/minha-loja/imagens?tipo=produto', { method: 'POST', body: Buffer.from('<svg/>'), type: 'image/png' });
  assert.equal(falso.status, 400);
  assert.equal((await request('/api/minha-loja/imagens?tipo=produto', { method: 'POST', body: { a: 1 } })).status, 415);
  assert.equal((await request('/api/minha-loja/imagens?tipo=capa', { method: 'POST', body: PNG, type: 'image/png' })).status, 400);
  const grande = Buffer.concat([PNG, Buffer.alloc(5 * 1024 * 1024)]);
  assert.equal((await request('/api/minha-loja/imagens?tipo=logo', { method: 'POST', body: grande, type: 'image/png' })).status, 413);
  state.perfil = { role: 'cliente', loja_id: null };
  assert.equal((await request('/api/minha-loja/imagens?tipo=logo', { method: 'POST', body: PNG, type: 'image/png' })).status, 403);
  assert.equal(state.upload, undefined);
});

test('falha no Storage não vaza detalhes', async () => {
  state.uploadError = { message: 'bucket not found: segredo' };
  const result = await request('/api/minha-loja/imagens?tipo=banner', { method: 'POST', body: PNG, type: 'image/png' });
  assert.deepEqual(result, { status: 502, body: { erro: 'Não foi possível salvar a imagem agora' } });
});

test('produto aceita ativo=false e recusa ativo inválido', async () => {
  state.rows.produtos[0].estoque = 1;
  const base = { nome: 'Camiseta', preco: 10, loja_id: lojaA };
  assert.equal((await request('/api/produtos', { method: 'POST', body: { ...base, ativo: 'nao' } })).status, 400);
});
