const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');

const lojaA = '11111111-1111-4111-8111-111111111111';
const usuario = '33333333-3333-4333-8333-333333333333';
const produto = '55555555-5555-4555-8555-555555555555';
const pedido = '66666666-6666-4666-8666-666666666666';
const endereco = {
  nome: 'Maria', cep: '89200-000', rua: 'Rua A', numero: '10',
  bairro: 'Centro', cidade: 'Joinville', estado: 'sc'
};
let state;
let server;
let base;

function query(table) {
  const call = { table, filters: [] };
  state.calls.push(call);
  return {
    select(columns) { call.select = columns; return this; },
    eq(key, value) { call.filters.push([key, value]); return this; },
    order() { return this; },
    maybeSingle() {
      if (table === 'usuarios') return Promise.resolve({ data: state.profile, error: null });
      if (table === 'produtos') return Promise.resolve({ data: { id: produto, nota_media: 4.5, total_avaliacoes: 2 }, error: null });
      if (table === 'pedidos') return Promise.resolve({ data: { id: pedido }, error: null });
      return Promise.resolve({ data: null, error: null });
    },
    then(resolve, reject) {
      return Promise.resolve({ data: state.rows[table] ?? [], error: null }).then(resolve, reject);
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
        async getUser() { return { data: { user: { id: usuario, email: 'maria@teste.com' } }, error: null }; },
        async signInWithPassword(input) {
          state.signIn = input;
          return { data: {}, error: input.password === 'senha-certa' ? null : { message: 'invalid' } };
        }
      }
    },
    createSupabaseClient: () => ({
      from: table => query(table),
      async rpc(name, args) {
        state.rpc = { name, args };
        return { data: name === 'criar_pedido' ? pedido : null, error: state.rpcError ?? null };
      }
    }),
    async updateAuthUser(token, attributes) {
      state.authUpdate = { token, attributes };
      return { ok: state.authUpdateOk ?? true, status: 200 };
    }
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
    calls: [], rows: {},
    profile: { id: usuario, nome: 'Maria', role: 'cliente', loja_id: null, telefone: '47 9999', endereco: null }
  };
});

async function request(path, method = 'GET', body) {
  const response = await fetch(base + path, {
    method,
    headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), Authorization: 'Bearer jwt' },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : null };
}

test('me devolve e-mail, telefone e endereço', async () => {
  const result = await request('/api/auth/me');
  assert.equal(result.status, 200);
  assert.equal(result.body.email, 'maria@teste.com');
  assert.equal(result.body.telefone, '47 9999');
});

test('editar perfil mantém o que não foi enviado e normaliza a UF', async () => {
  const result = await request('/api/auth/me', 'PATCH', { endereco });
  assert.equal(result.status, 200);
  assert.equal(state.rpc.name, 'atualizar_meu_perfil');
  assert.equal(state.rpc.args.p_nome, 'Maria');
  assert.equal(state.rpc.args.p_telefone, '47 9999');
  assert.equal(state.rpc.args.p_endereco.estado, 'SC');
});

test('editar perfil não aceita role, loja_id nem CEP inválido', async () => {
  assert.equal((await request('/api/auth/me', 'PATCH', { role: 'admin' })).status, 400);
  assert.equal((await request('/api/auth/me', 'PATCH', { loja_id: lojaA })).status, 400);
  assert.equal((await request('/api/auth/me', 'PATCH', { endereco: { ...endereco, cep: '123' } })).status, 400);
  assert.equal((await request('/api/auth/me', 'PATCH', {})).status, 400);
  assert.equal(state.rpc, undefined);
});

test('trocar senha exige a senha atual correta', async () => {
  const errada = await request('/api/auth/senha', 'PATCH', { senha_atual: 'x', nova_senha: 'novasenha123' });
  assert.deepEqual(errada, { status: 400, body: { erro: 'Senha atual incorreta' } });
  assert.equal(state.authUpdate, undefined);
  const certa = await request('/api/auth/senha', 'PATCH', { senha_atual: 'senha-certa', nova_senha: 'novasenha123' });
  assert.equal(certa.status, 204);
  assert.equal(state.signIn.email, 'maria@teste.com');
  assert.deepEqual(state.authUpdate.attributes, { password: 'novasenha123' });
  assert.equal((await request('/api/auth/senha', 'PATCH', { senha_atual: 'senha-certa', nova_senha: 'curta' })).status, 400);
});

test('trocar e-mail pede confirmação e recusa o mesmo e-mail', async () => {
  assert.equal((await request('/api/auth/email', 'PATCH', { email: 'MARIA@teste.com' })).status, 400);
  const result = await request('/api/auth/email', 'PATCH', { email: 'nova@teste.com' });
  assert.deepEqual(result, { status: 200, body: { confirmacao_email_pendente: true } });
  assert.deepEqual(state.authUpdate.attributes, { email: 'nova@teste.com' });
});

test('pedido envia variações, endereço e pagamento para a função', async () => {
  const itens = [
    { produto_id: produto, quantidade: 1, variacoes: { cor: 'preto', tamanho: 'm' } },
    { produto_id: produto, quantidade: 2, variacoes: { cor: 'branco', tamanho: 'm' } }
  ];
  const result = await request('/api/pedidos', 'POST', {
    loja_id: lojaA, itens, endereco_entrega: endereco, forma_pagamento: 'cartao', parcelas: 3
  });
  assert.equal(result.status, 201);
  assert.equal(state.rpc.name, 'criar_pedido');
  assert.deepEqual(state.rpc.args.p_itens, itens);
  assert.equal(state.rpc.args.p_endereco.estado, 'SC');
  assert.equal(state.rpc.args.p_forma_pagamento, 'cartao');
  assert.equal(state.rpc.args.p_parcelas, 3);
});

test('pedido recusa variação repetida, parcelas no PIX e endereço sem destinatário', async () => {
  const item = { produto_id: produto, quantidade: 1, variacoes: { cor: 'preto' } };
  assert.equal((await request('/api/pedidos', 'POST', { loja_id: lojaA, itens: [item, { ...item, quantidade: 2 }] })).status, 400);
  assert.equal((await request('/api/pedidos', 'POST', {
    loja_id: lojaA, itens: [item], forma_pagamento: 'pix', parcelas: 2
  })).status, 400);
  const { nome: _nome, ...semNome } = endereco;
  assert.equal((await request('/api/pedidos', 'POST', {
    loja_id: lojaA, itens: [item], endereco_entrega: semNome
  })).status, 400);
  assert.equal(state.rpc, undefined);
});

test('avaliação só para pedido concluído e com nota de 1 a 5', async () => {
  assert.equal((await request(`/api/produtos/${produto}/avaliacoes`, 'POST', { nota: 6 })).status, 400);
  state.rpcError = { message: 'VC_FORBIDDEN' };
  assert.deepEqual(await request(`/api/produtos/${produto}/avaliacoes`, 'POST', { nota: 5 }), {
    status: 403, body: { erro: 'Só é possível avaliar produtos de pedidos concluídos' }
  });
  state.rpcError = null;
  const ok = await request(`/api/produtos/${produto}/avaliacoes`, 'POST', { nota: 5, comentario: 'Ótimo' });
  assert.equal(ok.status, 201);
  assert.deepEqual(state.rpc, { name: 'avaliar_produto', args: { p_produto_id: produto, p_nota: 5, p_comentario: 'Ótimo' } });
});

test('lista de lojas traz a contagem de produtos', async () => {
  state.rows.lojas = [{ id: lojaA, nome: 'Loja A', produtos: [{ count: 7 }] }, { id: 'b', nome: 'B' }];
  const result = await request('/api/lojas');
  assert.deepEqual(result.body.map(loja => [loja.total_produtos, 'produtos' in loja]), [[7, false], [0, false]]);
});

test('produto aceita campos de vitrine e recusa URL de imagem que não seja http(s)', async () => {
  const base = { nome: 'Camiseta', preco: 59.9, loja_id: lojaA };
  assert.equal((await request('/api/produtos', 'POST', { ...base, imagens: ['javascript:alert(1)'] })).status, 400);
  assert.equal((await request('/api/produtos', 'POST', { ...base, variacoes: [{ id: 'cor', nome: 'Cor', opcoes: [] }] })).status, 400);
});

test('carrinho exige login e devolve só o do usuário com dados do produto', async () => {
  const semToken = await fetch(base + '/api/carrinho');
  assert.equal(semToken.status, 401);
  state.rows.carrinho_itens = [{ produto_id: produto, quantidade: 2, variacoes: {}, produtos: { nome: 'Caneca' } }];
  const result = await request('/api/carrinho');
  assert.equal(result.status, 200);
  assert.equal(result.body[0].produtos.nome, 'Caneca');
  const call = state.calls.find(c => c.table === 'carrinho_itens');
  assert.deepEqual(call.filters, [['usuario_id', usuario]]);
  assert.match(call.select, /produtos\(.*lojas\(nome\)\)/);
});

test('salvar carrinho troca tudo pela função e valida os itens', async () => {
  const itens = [
    { produto_id: produto, quantidade: 1, variacoes: { cor: 'preto' } },
    { produto_id: produto, quantidade: 3, variacoes: { cor: 'branco' } }
  ];
  const ok = await request('/api/carrinho', 'PUT', { itens });
  assert.equal(ok.status, 200);
  assert.deepEqual(state.rpc, { name: 'substituir_carrinho', args: { p_itens: itens } });
  state.rpc = undefined;
  assert.equal((await request('/api/carrinho', 'PUT', { itens: [itens[0], itens[0]] })).status, 400);
  assert.equal((await request('/api/carrinho', 'PUT', { itens: [{ produto_id: produto, quantidade: 0 }] })).status, 400);
  assert.equal((await request('/api/carrinho', 'PUT', { itens: [], usuario_id: usuario })).status, 400);
  assert.equal(state.rpc, undefined);
  assert.equal((await request('/api/carrinho', 'PUT', { itens: [] })).status, 200);
  assert.deepEqual(state.rpc.args, { p_itens: [] });
});
