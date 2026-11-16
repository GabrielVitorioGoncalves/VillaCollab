const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');

const usuario = '33333333-3333-4333-8333-333333333333';
const outro = '44444444-4444-4444-8444-444444444444';
const lojaA = '11111111-1111-4111-8111-111111111111';
const produto = '55555555-5555-4555-8555-555555555555';
const pedido = '66666666-6666-4666-8666-666666666666';
let state;
let server;
let base;

function query(table) {
  const call = { table, filters: {} };
  return {
    select() { return this; },
    eq(key, value) { call.filters[key] = value; return this; },
    in(key, values) { call.filters[key] = values; return this; },
    update(values) { call.update = values; return this; },
    insert(values) { call.insert = values; return this; },
    maybeSingle() {
      if (table === 'usuarios') return Promise.resolve({ data: state.perfil, error: null });
      if (table === 'pedidos') return Promise.resolve({ data: state.pedido, error: null });
      if (table === 'lojas') {
        if (call.update) return Promise.resolve({ data: { id: lojaA, ...call.update }, error: null });
        return Promise.resolve({ data: state.loja, error: null });
      }
      return Promise.resolve({ data: null, error: null });
    },
    single() { return Promise.resolve({ data: { id: lojaA, ...call.insert }, error: null }); },
    then(resolve, reject) {
      const data = table === 'produtos' ? state.produtos : [];
      return Promise.resolve({ data, error: null }).then(resolve, reject);
    }
  };
}

const configPath = require.resolve('../src/config/supabase');
require.cache[configPath] = {
  id: configPath, filename: configPath, loaded: true,
  exports: {
    supabase: {
      from: table => query(table),
      auth: { async getUser() { return { data: { user: { id: usuario, email: 'maria@teste.com' } }, error: null }; } }
    },
    createSupabaseClient: () => ({
      from: table => query(table),
      async rpc(name, args) { state.rpc = { name, args }; return { data: pedido, error: state.rpcError }; }
    }),
    async signOutSession() { return { ok: true, status: 204 }; },
    async updateAuthUser() { return { ok: true, status: 200 }; }
  }
};
const app = require('../src/app').default;
const { telefoneWhatsappValido, numeroWhatsapp, mensagemDoPedido } = require('../src/services/whatsapp');

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

const pedidoBase = () => ({
  id: pedido, usuario_id: usuario, loja_id: lojaA, status: 'pendente', total: '89.80',
  endereco_entrega: { nome: 'Maria Silva', cep: '89200-000', rua: 'Rua do Príncipe', numero: '100', complemento: 'Apto 2', bairro: 'Centro', cidade: 'Joinville', estado: 'SC' },
  itens_pedido: [{ produto_id: produto, quantidade: 2, preco_unitario: '44.90', subtotal: '89.80', variacoes: { tamanho: 'm' } }]
});

beforeEach(() => {
  state = {
    perfil: { role: 'cliente', loja_id: null, admin_permissoes: null },
    pedido: pedidoBase(),
    loja: { nome: 'Ateliê Linho', telefone: '(47) 99999-0000' },
    produtos: [{ id: produto, nome: 'Camiseta de linho', variacoes: [{ id: 'tamanho', nome: 'Tamanho', opcoes: [{ id: 'm', nome: 'M' }] }] }],
    rpcError: null
  };
});

async function request(path, { method = 'GET', body } = {}) {
  const response = await fetch(base + path, {
    method,
    headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), Authorization: 'Bearer jwt' },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : null };
}

test('valida e normaliza o WhatsApp da loja', () => {
  for (const valido of ['(47) 99999-0000', '47999990000', '(47) 3333-4444', '+55 47 99999-0000', '55 47 99999-0000']) {
    assert.equal(telefoneWhatsappValido(valido), true, valido);
  }
  for (const invalido of ['', '12345', '(47) 9999', '+1 415 555 0100', '(07) 99999-0000', 'abc', '47 99999+0000', '(47) 99999-0000 ramal 2']) {
    assert.equal(telefoneWhatsappValido(invalido), false, invalido);
  }
  assert.equal(numeroWhatsapp('(47) 99999-0000'), '5547999990000');
  assert.equal(numeroWhatsapp('(47) 3333-4444'), '554733334444');
  assert.equal(numeroWhatsapp('+55 47 99999-0000'), '5547999990000');
  assert.equal(numeroWhatsapp(null), null);
});

test('mensagem traz pedido, itens com variação, total e endereço', () => {
  const texto = mensagemDoPedido(pedidoBase(), 'Ateliê Linho', state.produtos);
  assert.match(texto, /pedido 66666666 na Ateliê Linho/);
  assert.match(texto, /2x Camiseta de linho \(Tamanho: M\) - R\$ 89,80/);
  assert.match(texto, /Total: R\$ 89,80/);
  assert.match(texto, /Entrega para Maria Silva:\nRua do Príncipe, 100, Apto 2 - Centro - Joinville\/SC - CEP 89200-000/);
});

test('mensagem não deixa nome de produto quebrar o texto e resume pedidos grandes', () => {
  const grande = pedidoBase();
  grande.itens_pedido = Array.from({ length: 35 }, (_, i) => ({ produto_id: `p${i}`, quantidade: 1, subtotal: 1, variacoes: {} }));
  const texto = mensagemDoPedido(grande, 'Loja', [{ id: 'p0', nome: 'Nome\n\nfalso\tTotal: R$ 0,00' }]);
  assert.match(texto, /1x Nome falso Total: R\$ 0,00 - R\$ 1,00/);
  assert.match(texto, /e mais 5 itens/);
  assert.equal((texto.match(/^• /gm) ?? []).length, 31);
});

test('cliente recebe o link do WhatsApp da loja do próprio pedido', async () => {
  const r = await request(`/api/pedidos/${pedido}/whatsapp`);
  assert.equal(r.status, 200);
  assert.ok(r.body.url.startsWith('https://wa.me/5547999990000?text='));
  assert.match(decodeURIComponent(r.body.url.split('text=')[1]), /Camiseta de linho/);
});

test('link do WhatsApp: só o comprador, pedido não cancelado e loja com número', async () => {
  state.pedido = { ...pedidoBase(), usuario_id: outro };
  assert.equal((await request(`/api/pedidos/${pedido}/whatsapp`)).status, 404);
  state.pedido = { ...pedidoBase(), status: 'cancelado' };
  assert.equal((await request(`/api/pedidos/${pedido}/whatsapp`)).status, 409);
  state.pedido = pedidoBase();
  state.loja = { nome: 'Sem número', telefone: null };
  const semNumero = await request(`/api/pedidos/${pedido}/whatsapp`);
  assert.equal(semNumero.status, 409);
  assert.match(semNumero.body.erro, /WhatsApp/);
  assert.equal((await request('/api/pedidos/nao-e-uuid/whatsapp')).status, 400);
});

test('pedido aceita a forma whatsapp e loja sem número vira 409', async () => {
  const body = { loja_id: lojaA, itens: [{ produto_id: produto, quantidade: 1 }], forma_pagamento: 'whatsapp' };
  assert.equal((await request('/api/pedidos', { method: 'POST', body })).status, 201);
  assert.equal(state.rpc.args.p_forma_pagamento, 'whatsapp');
  assert.equal((await request('/api/pedidos', { method: 'POST', body: { ...body, parcelas: 2 } })).status, 400);
  state.rpcError = { message: 'VC_CONTACT' };
  const r = await request('/api/pedidos', { method: 'POST', body });
  assert.equal(r.status, 409);
  assert.match(r.body.erro, /WhatsApp/);
});

test('loja não fica sem WhatsApp: obrigatório no cadastro e não pode ser apagado', async () => {
  state.perfil = { role: 'admin', loja_id: null, admin_permissoes: null };
  assert.equal((await request('/api/lojas', { method: 'POST', body: { nome: 'Nova', slug: 'nova' } })).status, 400);
  assert.equal((await request('/api/lojas', { method: 'POST', body: { nome: 'Nova', slug: 'nova', telefone: '123' } })).status, 400);
  assert.equal((await request('/api/lojas', { method: 'POST', body: { nome: 'Nova', slug: 'nova', telefone: '(47) 99999-0000' } })).status, 201);
  state.perfil = { role: 'lojista', loja_id: lojaA, admin_permissoes: null };
  assert.equal((await request(`/api/lojas/${lojaA}`, { method: 'PATCH', body: { telefone: null } })).status, 400);
  assert.equal((await request(`/api/lojas/${lojaA}`, { method: 'PATCH', body: { telefone: '' } })).status, 400);
  assert.equal((await request(`/api/lojas/${lojaA}`, { method: 'PATCH', body: { telefone: '(47) 98888-1111' } })).status, 200);
});
