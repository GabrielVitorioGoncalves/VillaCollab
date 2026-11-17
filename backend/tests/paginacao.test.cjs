const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');

const lojaA = '11111111-1111-4111-8111-111111111111';
const lojista = '33333333-3333-4333-8333-333333333333';
const maria = '44444444-4444-4444-8444-444444444444';
const joao = '55555555-5555-4555-8555-555555555555';
const tokenCom = (aal) => `cabecalho.${Buffer.from(JSON.stringify({ aal })).toString('base64url')}.assinatura`;
let state;
let server;
let base;

function consulta(origem) {
  const call = { origem, eq: [], or: [], order: [] };
  state.calls.push(call);
  const builder = {
    select(colunas, opcoes) { call.select = colunas; call.count = opcoes?.count; return builder; },
    eq(chave, valor) { call.eq.push([chave, valor]); return builder; },
    or(filtro) { call.or.push(filtro); return builder; },
    order(chave) { call.order.push(chave); return builder; },
    range(inicio, fim) { call.range = [inicio, fim]; return builder; },
    maybeSingle() {
      if (origem === 'usuarios') return Promise.resolve({ data: state.perfil, error: null });
      return Promise.resolve({ data: null, error: null });
    },
    then(resolve, reject) {
      return Promise.resolve({ data: state.linhas, error: null, count: state.total }).then(resolve, reject);
    }
  };
  return builder;
}

const configPath = require.resolve('../src/config/supabase');
require.cache[configPath] = {
  id: configPath, filename: configPath, loaded: true,
  exports: {
    supabase: {
      from: tabela => consulta(tabela),
      auth: { async getUser() {
        return { data: { user: { id: state.perfil.id, email: 'x@y.com', factors: [] } }, error: null };
      } }
    },
    createSupabaseClient: () => ({
      from: tabela => consulta(tabela),
      rpc(nome, args, opcoes) {
        if (nome === 'clientes_da_loja') {
          return Promise.resolve({ data: [
            { usuario_id: maria, nome: 'Maria Souza', telefone: null, email: 'maria@x.com' },
            { usuario_id: joao, nome: 'João Lima', telefone: null, email: 'joao@x.com' }
          ], error: null });
        }
        if (nome === 'resumo_minha_loja') {
          return Promise.resolve({ data: { pedidos: { total: 3 }, produtos: { total: 2 }, estoque_baixo: [] }, error: state.erroRpc ?? null });
        }
        const call = consulta(`rpc:${nome}`);
        call.select(undefined, opcoes);
        return call;
      }
    }),
    createServiceClient: () => null,
    async signOutSession() { return { ok: true, status: 204 }; },
    async updateAuthUser() { return { ok: true, status: 200 }; },
    async requisicaoAuth() { return { ok: true, status: 200, dados: { factors: [] } }; }
  }
};
const app = require('../src/app').default;
const { faixaDeId, termoDeBusca } = require('../src/schemas/paginacao');

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
    perfil: { id: lojista, role: 'lojista', loja_id: lojaA, admin_permissoes: null },
    linhas: [], total: 0, calls: []
  };
});

async function get(path, token = tokenCom('aal1')) {
  const response = await fetch(base + path, { headers: { Authorization: `Bearer ${token}` } });
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : null };
}
const ultima = origem => [...state.calls].reverse().find(call => call.origem === origem);

test('busca tira caracteres que mudariam o filtro do banco', () => {
  assert.equal(termoDeBusca('  café, (com) leite*% '), 'café com leite');
  assert.equal(termoDeBusca('x),ativa.eq.false'), 'x ativa.eq.false');
  assert.equal(termoDeBusca(' ,() '), null);
});

test('código do pedido vira faixa de IDs; texto comum não', () => {
  assert.deepEqual(faixaDeId('#AB12CD34'), {
    de: 'ab12cd34-0000-0000-0000-000000000000', ate: 'ab12cd34-ffff-ffff-ffff-ffffffffffff'
  });
  assert.equal(faixaDeId('maria'), null);
  assert.equal(faixaDeId('abc'), null);
});

test('vitrine de lojas: sem página continua lista; com página usa faixa, contagem e só lojas ativas', async () => {
  state.linhas = [{ id: lojaA, nome: 'Alfa', ativa: true, produtos: [{ count: 4 }] }];
  state.total = 31;
  const lista = await get('/api/lojas');
  assert.ok(Array.isArray(lista.body));
  const pagina = await get('/api/lojas?pagina=3&por_pagina=12&busca=alfa');
  assert.equal(pagina.status, 200);
  assert.deepEqual(pagina.body, { itens: [{ id: lojaA, nome: 'Alfa', ativa: true, total_produtos: 4 }], total: 31, pagina: 3, por_pagina: 12 });
  const call = ultima('lojas');
  assert.deepEqual(call.range, [24, 35]);
  assert.equal(call.count, 'exact');
  assert.deepEqual(call.eq, [['ativa', true]]);
  assert.match(call.or[0], /^nome\.ilike\.\*alfa\*,/);
});

test('página e tamanho fora do limite são recusados', async () => {
  assert.equal((await get('/api/lojas?pagina=0')).status, 400);
  assert.equal((await get('/api/lojas?pagina=1&por_pagina=51')).status, 400);
  assert.equal((await get(`/api/lojas?pagina=1&busca=${'a'.repeat(101)}`)).status, 400);
});

test('pedidos do lojista: busca por cliente vira filtro por ID, sempre na própria loja', async () => {
  state.linhas = [{ id: 'p1', usuario_id: maria, status: 'pendente' }];
  state.total = 1;
  const resposta = await get('/api/minha-loja/pedidos?pagina=1&status=pendente&busca=maria');
  assert.equal(resposta.status, 200);
  assert.equal(resposta.body.itens[0].cliente.nome, 'Maria Souza');
  const call = ultima('pedidos');
  assert.deepEqual(call.eq, [['loja_id', lojaA], ['status', 'pendente']]);
  assert.deepEqual(call.or, [`usuario_id.in.(${maria})`]);
});

test('pedidos do lojista: busca sem cliente nem código responde vazio sem consultar pedidos', async () => {
  const resposta = await get('/api/minha-loja/pedidos?pagina=1&busca=ninguem');
  assert.deepEqual(resposta.body, { itens: [], total: 0, pagina: 1, por_pagina: 20 });
  assert.equal(ultima('pedidos')?.range, undefined);
  assert.equal((await get('/api/minha-loja/pedidos?pagina=1&status=qualquer')).status, 400);
});

test('resumo do painel exige lojista', async () => {
  assert.equal((await get('/api/minha-loja/resumo')).body.pedidos.total, 3);
  state.perfil = { ...state.perfil, role: 'cliente', loja_id: null };
  assert.equal((await get('/api/minha-loja/resumo')).status, 403);
});

test('admin: listas paginadas usam a função do banco com filtros e exigem MFA', async () => {
  state.perfil = { id: lojista, role: 'admin', loja_id: null, admin_permissoes: null };
  state.linhas = [{ id: maria, nome: 'Maria' }, { id: lojista, nome: 'Eu' }];
  state.total = 2;
  assert.equal((await get('/api/admin/usuarios?pagina=1')).status, 403);
  const usuarios = await get('/api/admin/usuarios?pagina=2&por_pagina=10&papel=lojista&busca=ma', tokenCom('aal2'));
  assert.equal(usuarios.status, 200);
  assert.deepEqual(usuarios.body.itens.map(u => u.voce), [false, true]);
  const callUsuarios = ultima('rpc:admin_listar_usuarios');
  assert.deepEqual(callUsuarios.range, [10, 19]);
  assert.deepEqual(callUsuarios.eq, [['role', 'lojista']]);
  const lojas = await get('/api/admin/lojas?pagina=1&status=inativo&busca=12.345', tokenCom('aal2'));
  assert.equal(lojas.status, 200);
  const callLojas = ultima('rpc:admin_listar_lojas');
  assert.deepEqual(callLojas.eq, [['ativa', false]]);
  assert.match(callLojas.or[0], /cnpj\.ilike\.\*12345\*/);
  assert.equal((await get('/api/admin/lojas?pagina=1&status=outro', tokenCom('aal2'))).status, 400);
});
