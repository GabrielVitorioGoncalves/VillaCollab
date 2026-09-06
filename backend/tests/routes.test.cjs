const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');

const lojaId = '11111111-1111-4111-8111-111111111111';
const outraLoja = '22222222-2222-4222-8222-222222222222';
const userId = '33333333-3333-4333-8333-333333333333';
const validBody = { nome: 'Camiseta', preco: 49.9, loja_id: lojaId, descricao: 'Algodão' };
let state;
let server;
let base;

// Substitui apenas a fronteira Supabase antes de carregar a aplicação real.
// Nenhum cliente remoto é criado; controllers, services e schemas são reais.
function query(table, token) {
  const call = { table, token };
  state.calls.push(call);
  return {
    select(columns) { call.columns = columns; return this; },
    insert(body) { call.insert = body; return this; },
    update(body) { call.update = body; return this; },
    delete() { call.delete = true; return this; },
    async limit() {
      if (state.healthThrows) throw new Error('segredo-do-provedor');
      return { error: state.healthError };
    },
    eq(column, value) {
      call.filter = [column, value];
      (call.filters ??= []).push([column, value]);
      return column === 'id' || call.update || call.delete ? this : Promise.resolve({ data: state.products, error: state.listError });
    },
    async maybeSingle() {
      if (call.delete) {
        return { data: state.deleteMissing || state.deleteError ? null : { id: state.product.id }, error: state.deleteError };
      }
      if (call.update) {
        return {
          data: state.updateMissing || state.updateError ? null : { ...state.product, ...call.update },
          error: state.updateError
        };
      }
      return table === 'usuarios'
        ? { data: state.profile, error: state.profileError }
        : { data: state.product, error: state.detailError };
    },
    async single() {
      return {
        data: state.insertError ? null : { id: outraLoja, ...call.insert, estoque: 0, created_at: '2026-09-06T00:00:00Z' },
        error: state.insertError
      };
    }
  };
}

const configPath = require.resolve('../src/config/supabase');
require.cache[configPath] = {
  id: configPath, filename: configPath, loaded: true,
  exports: {
    supabase: {
      from: table => query(table),
      auth: {
        async getUser(token) {
          state.tokens.push(token);
          if (state.authThrows) throw new Error('segredo-do-provedor');
          return { data: { user: state.authError ? null : { id: userId } }, error: state.authError };
        }
      }
    },
    createSupabaseClient: token => ({ from: table => query(table, token) })
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
  await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  delete require.cache[configPath];
});
beforeEach(() => {
  state = { calls: [], tokens: [], profile: { role: 'lojista', loja_id: lojaId }, products: [validBody] };
});

async function request(path, options) {
  const response = await fetch(base + path, options);
  const body = await response.json();
  assert.ok(!JSON.stringify(body).includes('segredo-do-provedor'));
  return { status: response.status, body };
}
function post(body = validBody, authorization = 'Bearer token-de-teste') {
  return request('/api/produtos', {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...(authorization ? { Authorization: authorization } : {}) },
    body: JSON.stringify(body)
  });
}

test('GET health saudável retorna 200 no caminho correto', async () => {
  const result = await request('/api/health');
  assert.equal(result.status, 200);
  assert.equal(result.body.status, 'ok');
  assert.equal(result.body.database, 'available');
  assert.equal(result.body.service, 'Villa Collab API');
  assert.ok(!Number.isNaN(Date.parse(result.body.timestamp)));
  assert.equal(state.calls[0].table, 'lojas');
});
test('GET health com erro de consulta retorna 503 sem detalhes', async () => {
  state.healthError = { message: 'segredo-do-provedor' };
  const result = await request('/api/health');
  assert.equal(result.status, 503);
  assert.equal(result.body.status, 'error');
  assert.equal(result.body.database, 'unavailable');
});
test('GET health com exceção retorna o mesmo contrato de indisponibilidade', async () => {
  state.healthThrows = true;
  const result = await request('/api/health');
  assert.equal(result.status, 503);
  assert.deepEqual(Object.keys(result.body).sort(), ['database', 'service', 'status', 'timestamp']);
});
test('POST válido retorna 201, verifica vínculo e usa token sem enviar estoque', async () => {
  const result = await post({ ...validBody, nome: '  Camiseta  ', estoque: 7 });
  assert.equal(result.status, 201);
  assert.equal(result.body.nome, 'Camiseta');
  assert.equal(result.body.estoque, 0);
  assert.deepEqual(state.tokens, ['token-de-teste']);
  assert.deepEqual(state.calls.map(call => call.table), ['usuarios', 'produtos']);
  assert.deepEqual(state.calls[0].filter, ['id', userId]);
  assert.ok(state.calls.every(call => call.token === 'token-de-teste'));
  assert.deepEqual(state.calls[1].insert, validBody);
});

for (const [name, patch] of [
  ['nome vazio de conteúdo', { nome: '   ' }],
  ['nome curto', { nome: 'ab' }],
  ['nome acima de 255 caracteres', { nome: 'a'.repeat(256) }],
  ['preço zero', { preco: 0 }],
  ['preço negativo', { preco: -1 }],
  ['preço textual', { preco: '49.90' }],
  ['preço fora de DECIMAL(10,2)', { preco: 100000000 }],
  ['fração de centavo', { preco: 1.234 }],
  ['UUID inválido', { loja_id: 'invalido' }]
]) {
  test(`POST rejeita ${name} com 400 antes de consultar tabelas`, async () => {
    const result = await post({ ...validBody, ...patch });
    assert.equal(result.status, 400);
    assert.equal(result.body.erro, 'Dados inválidos');
    assert.equal(state.calls.length, 0);
  });
}
test('POST aceita limites SQL e descrição ausente', async () => {
  const result = await post({ nome: 'a'.repeat(255), preco: 99999999.99, loja_id: lojaId });
  assert.equal(result.status, 201);
});
test('JSON malformado retorna 400 sem executar autenticação ou consultas', async () => {
  const result = await request('/api/produtos', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{'
  });
  assert.equal(result.status, 400);
  assert.equal(result.body.erro, 'JSON inválido');
  assert.equal(state.calls.length, 0);
  assert.equal(state.tokens.length, 0);
});
for (const authorization of [null, 'Bearer', 'Bearer token extra']) {
  test(`POST rejeita autorização ausente/malformada: ${authorization}`, async () => {
    assert.equal((await post(validBody, authorization)).status, 401);
    assert.equal(state.tokens.length, 0);
    assert.equal(state.calls.length, 0);
  });
}
test('POST rejeita token inválido', async () => {
  state.authError = { message: 'segredo-do-provedor' };
  assert.equal((await post()).status, 401);
  assert.equal(state.calls.length, 0);
});
for (const [name, profile] of [
  ['outra loja', { role: 'lojista', loja_id: outraLoja }],
  ['cliente', { role: 'cliente', loja_id: lojaId }],
  ['perfil ausente', null],
  ['sem loja', { role: 'lojista', loja_id: null }],
  ['admin sem regra de cadastro definida', { role: 'admin', loja_id: lojaId }]
]) {
  test(`POST nega ${name} com 403 sem inserir`, async () => {
    state.profile = profile;
    assert.equal((await post()).status, 403);
    assert.ok(state.calls.every(call => !call.insert));
  });
}
for (const failure of ['profileError', 'insertError', 'authThrows']) {
  test(`POST falha interna em ${failure} não expõe detalhes`, async () => {
    state[failure] = { message: 'segredo-do-provedor' };
    const result = await post();
    assert.equal(result.status, 500);
    assert.deepEqual(result.body, { erro: 'Erro interno no servidor' });
    if (failure !== 'insertError') assert.ok(state.calls.every(call => !call.insert));
  });
}
test('GET produtos público retorna array filtrado por loja', async () => {
  const result = await request(`/api/produtos/loja/${lojaId}`);
  assert.equal(result.status, 200);
  assert.deepEqual(result.body, [validBody]);
  assert.deepEqual(state.calls[0].filter, ['loja_id', lojaId]);
  assert.equal(state.tokens.length, 0);
});
test('GET loja sem produtos retorna array vazio', async () => {
  state.products = [];
  assert.deepEqual(await request(`/api/produtos/loja/${lojaId}`), { status: 200, body: [] });
});
test('GET UUID inválido retorna 400 sem consultar Supabase', async () => {
  assert.equal((await request('/api/produtos/loja/invalido')).status, 400);
  assert.equal(state.calls.length, 0);
});
test('GET falha interna não expõe detalhes', async () => {
  state.listError = { message: 'segredo-do-provedor' };
  assert.deepEqual(await request(`/api/produtos/loja/${lojaId}`), {
    status: 500, body: { erro: 'Erro interno no servidor' }
  });
});

test('GET detalhe público retorna 200 e o objeto do produto pelo ID', async () => {
  state.product = { id: outraLoja, ...validBody, estoque: 0, created_at: '2026-09-06T00:00:00Z' };
  const result = await request(`/api/produtos/${outraLoja}`);
  assert.deepEqual(result, { status: 200, body: state.product });
  assert.equal(state.tokens.length, 0);
  assert.equal(state.calls.length, 1);
  assert.equal(state.calls[0].table, 'produtos');
  assert.deepEqual(state.calls[0].filter, ['id', outraLoja]);
  assert.equal(state.calls[0].token, undefined);
});
test('GET detalhe inexistente retorna 404', async () => {
  state.product = null;
  assert.deepEqual(await request(`/api/produtos/${outraLoja}`), {
    status: 404, body: { erro: 'Produto não encontrado.' }
  });
});
test('GET detalhe com UUID inválido retorna 400 sem consultar Supabase', async () => {
  const result = await request('/api/produtos/invalido');
  assert.equal(result.status, 400);
  assert.equal(result.body.erro, 'Dados inválidos');
  assert.ok(result.body.detalhes.id.length > 0);
  assert.equal(state.calls.length, 0);
  assert.equal(state.tokens.length, 0);
});
test('GET detalhe com erro do Supabase retorna 500 sem expor mensagem interna', async () => {
  state.product = null;
  state.detailError = { message: 'segredo-do-provedor' };
  assert.deepEqual(await request(`/api/produtos/${outraLoja}`), {
    status: 500, body: { erro: 'Erro interno no servidor' }
  });
});

function patchProduto(body = { nome: 'Camiseta Premium' }, id = outraLoja, authorization = 'Bearer token-de-teste') {
  return request(`/api/produtos/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...(authorization ? { Authorization: authorization } : {}) },
    body: JSON.stringify(body)
  });
}
function produtoExistente() {
  state.product = { id: outraLoja, ...validBody, estoque: 5, created_at: '2026-09-06T00:00:00Z' };
}

test('PATCH lojista da própria loja recebe o produto atualizado e preserva campos protegidos', async () => {
  produtoExistente();
  const result = await patchProduto({ nome: '  Camiseta Premium  ', preco: 59.9 });
  assert.deepEqual(result, { status: 200, body: { ...state.product, nome: 'Camiseta Premium', preco: 59.9 } });
  assert.deepEqual(state.calls.map(call => call.table), ['produtos', 'usuarios', 'produtos']);
  assert.deepEqual(state.calls[0].filters, [['id', outraLoja]]);
  assert.deepEqual(state.calls[1].filters, [['id', userId]]);
  assert.deepEqual(state.calls[2].filters, [['id', outraLoja], ['loja_id', lojaId]]);
  assert.deepEqual(state.calls[2].update, { nome: 'Camiseta Premium', preco: 59.9 });
  assert.ok(state.calls.every(call => call.token === 'token-de-teste'));
});
test('PATCH parcial somente de descrição preserva nome e preço', async () => {
  produtoExistente();
  const result = await patchProduto({ descricao: 'Nova descrição' });
  assert.deepEqual(result, { status: 200, body: { ...state.product, descricao: 'Nova descrição' } });
  assert.deepEqual(state.calls[2].update, { descricao: 'Nova descrição' });
});
test('PATCH UUID inválido retorna 400 sem consultar tabelas', async () => {
  assert.equal((await patchProduto({ nome: 'Produto' }, 'invalido')).status, 400);
  assert.equal(state.calls.length, 0);
});
for (const [name, body] of [
  ['body vazio', {}],
  ['nome em branco', { nome: '   ' }],
  ['nome curto', { nome: 'ab' }],
  ['nome longo', { nome: 'a'.repeat(256) }],
  ['preço zero', { preco: 0 }],
  ['preço negativo', { preco: -1 }],
  ['fração de centavo', { preco: 1.234 }],
  ['preço acima do limite SQL', { preco: 100000000 }],
  ['preço textual', { preco: '59.90' }],
  ['descrição nula', { descricao: null }],
  ['campo loja_id', { nome: 'Produto', loja_id: outraLoja }],
  ['campo id', { nome: 'Produto', id: lojaId }],
  ['campo estoque', { nome: 'Produto', estoque: 100 }],
  ['campo created_at', { nome: 'Produto', created_at: '2020-01-01' }],
  ['campo desconhecido', { nome: 'Produto', extra: true }]
]) {
  test(`PATCH rejeita ${name} com 400 e não atualiza`, async () => {
    produtoExistente();
    const original = { ...state.product };
    assert.equal((await patchProduto(body)).status, 400);
    assert.equal(state.calls.length, 0);
    assert.deepEqual(state.product, original);
  });
}
test('PATCH sem token retorna 401 sem consultar tabelas', async () => {
  assert.equal((await patchProduto({ nome: 'Produto' }, outraLoja, null)).status, 401);
  assert.equal(state.calls.length, 0);
});
test('PATCH token inválido retorna 401 sem consultar tabelas', async () => {
  state.authError = { message: 'segredo-do-provedor' };
  assert.equal((await patchProduto()).status, 401);
  assert.equal(state.calls.length, 0);
});
for (const [name, profile] of [
  ['lojista de outra loja', { role: 'lojista', loja_id: outraLoja }],
  ['cliente', { role: 'cliente', loja_id: lojaId }],
  ['perfil ausente', null],
  ['administrador sem concessão especial', { role: 'admin', loja_id: lojaId }]
]) {
  test(`PATCH ${name} retorna 403 sem atualizar`, async () => {
    produtoExistente();
    state.profile = profile;
    const result = await patchProduto();
    assert.deepEqual(result, { status: 403, body: { erro: 'Sem permissão para editar este produto' } });
    assert.equal(state.calls.length, 2);
    assert.ok(state.calls.every(call => !call.update));
  });
}
test('PATCH produto de outra loja é negado usando a loja real do produto', async () => {
  produtoExistente();
  state.product.loja_id = outraLoja;
  assert.equal((await patchProduto()).status, 403);
  assert.ok(state.calls.every(call => !call.update));
});
test('PATCH produto inexistente retorna 404 antes de consultar perfil', async () => {
  state.product = null;
  assert.deepEqual(await patchProduto(), { status: 404, body: { erro: 'Produto não encontrado.' } });
  assert.equal(state.calls.length, 1);
});
test('PATCH produto desaparece antes da atualização: 404 sem sucesso falso', async () => {
  produtoExistente();
  state.updateMissing = true;
  assert.deepEqual(await patchProduto(), { status: 404, body: { erro: 'Produto não encontrado.' } });
  assert.equal(state.calls.length, 3);
});
for (const failure of ['detailError', 'profileError', 'updateError']) {
  test(`PATCH falha em ${failure} retorna 500 sem detalhes internos`, async () => {
    produtoExistente();
    state[failure] = { message: 'segredo-do-provedor' };
    assert.deepEqual(await patchProduto(), { status: 500, body: { erro: 'Erro interno no servidor' } });
    if (failure !== 'updateError') assert.ok(state.calls.every(call => !call.update));
  });
}

async function deleteProduto(id = outraLoja, authorization = 'Bearer token-de-teste', body) {
  const response = await fetch(`${base}/api/produtos/${id}`, {
    method: 'DELETE',
    headers: { ...(authorization ? { Authorization: authorization } : {}), ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}) },
    body: body !== undefined ? JSON.stringify(body) : undefined
  });
  const text = await response.text();
  assert.ok(!text.includes('segredo-do-provedor'));
  return { status: response.status, body: text ? JSON.parse(text) : '' };
}
test('DELETE da própria loja retorna 204 vazio e filtra por ID e loja real', async () => {
  produtoExistente();
  assert.deepEqual(await deleteProduto(), { status: 204, body: '' });
  assert.deepEqual(state.calls.map(call => call.table), ['produtos', 'usuarios', 'produtos']);
  assert.deepEqual(state.calls[0].filters, [['id', outraLoja]]);
  assert.deepEqual(state.calls[1].filters, [['id', userId]]);
  assert.deepEqual(state.calls[2].filters, [['id', outraLoja], ['loja_id', lojaId]]);
  assert.equal(state.calls[2].delete, true);
  assert.ok(state.calls.every(call => call.token === 'token-de-teste'));
});
test('DELETE UUID inválido retorna 400 sem consultar tabelas', async () => {
  assert.equal((await deleteProduto('invalido')).status, 400);
  assert.equal(state.calls.length, 0);
});
test('DELETE rejeita loja_id no body antes de consultar tabelas', async () => {
  assert.equal((await deleteProduto(outraLoja, 'Bearer token-de-teste', { loja_id: lojaId })).status, 400);
  assert.equal(state.calls.length, 0);
});
test('DELETE sem token retorna 401', async () => {
  assert.equal((await deleteProduto(outraLoja, null)).status, 401);
  assert.equal(state.calls.length, 0);
});
test('DELETE token inválido retorna 401', async () => {
  state.authError = { message: 'segredo-do-provedor' };
  assert.equal((await deleteProduto()).status, 401);
  assert.equal(state.calls.length, 0);
});
for (const [name, profile] of [
  ['lojista de outra loja', { role: 'lojista', loja_id: outraLoja }],
  ['cliente', { role: 'cliente', loja_id: lojaId }],
  ['perfil ausente', null],
  ['admin sem exceção', { role: 'admin', loja_id: lojaId }]
]) {
  test(`DELETE nega ${name} com 403 sem excluir`, async () => {
    produtoExistente();
    state.profile = profile;
    assert.deepEqual(await deleteProduto(), { status: 403, body: { erro: 'Sem permissão para excluir este produto' } });
    assert.equal(state.calls.length, 2);
    assert.ok(state.calls.every(call => !call.delete));
  });
}
test('DELETE considera a loja real do produto para negar acesso', async () => {
  produtoExistente();
  state.product.loja_id = outraLoja;
  assert.equal((await deleteProduto()).status, 403);
  assert.ok(state.calls.every(call => !call.delete));
});
test('DELETE produto inexistente retorna 404 sem consultar perfil', async () => {
  state.product = null;
  assert.deepEqual(await deleteProduto(), { status: 404, body: { erro: 'Produto não encontrado.' } });
  assert.equal(state.calls.length, 1);
});
test('DELETE nenhuma linha excluída retorna 404 em vez de sucesso falso', async () => {
  produtoExistente();
  state.deleteMissing = true;
  assert.deepEqual(await deleteProduto(), { status: 404, body: { erro: 'Produto não encontrado.' } });
  assert.equal(state.calls[2].delete, true);
});
for (const failure of ['detailError', 'profileError', 'deleteError']) {
  test(`DELETE falha em ${failure} retorna 500 sem detalhes internos`, async () => {
    produtoExistente();
    state[failure] = { message: 'segredo-do-provedor' };
    assert.deepEqual(await deleteProduto(), { status: 500, body: { erro: 'Erro interno no servidor' } });
    if (failure !== 'deleteError') assert.ok(state.calls.every(call => !call.delete));
  });
}
