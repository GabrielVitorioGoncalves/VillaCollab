const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');

const admin = '11111111-1111-4111-8111-111111111111';
const outro = '22222222-2222-4222-8222-222222222222';
const lojaA = '33333333-3333-4333-8333-333333333333';
const novaConta = '44444444-4444-4444-8444-444444444444';
const CNPJ_VALIDO = '11.222.333/0001-81';
let state;
let server;
let base;

function query(table) {
  const call = { table, filters: [] };
  const builder = {
    select(columns) { call.select = columns; return this; },
    eq(key, value) { call.filters.push([key, value]); return this; },
    neq() { return this; },
    limit() { return this; },
    maybeSingle() {
      if (table === 'usuarios') return Promise.resolve({ data: state.perfil, error: null });
      if (table === 'lojas') return Promise.resolve({ data: state.lojaExiste ? { id: lojaA } : null, error: null });
      return Promise.resolve({ data: null, error: null });
    },
    then(resolve, reject) {
      const data = table === 'lojas' && state.cnpjEmUso ? [{ id: outro }] : [];
      return Promise.resolve({ data, error: null }).then(resolve, reject);
    }
  };
  return builder;
}

const loja = {
  id: lojaA, nome: 'Loja A', slug: 'loja-a', cnpj: '11222333000181', ativa: true,
  responsavel_id: outro, responsavel_email: 'dono@x.com'
};

const configPath = require.resolve('../src/config/supabase');
require.cache[configPath] = {
  id: configPath, filename: configPath, loaded: true,
  exports: {
    supabase: {
      from: table => query(table),
      auth: { async getUser(token) {
        return token === 'invalido' ? { data: { user: null }, error: { message: 'x' } }
          : { data: { user: { id: admin, email: 'admin@x.com' } }, error: null };
      } }
    },
    createSupabaseClient: () => ({
      from: table => query(table),
      async rpc(name, args) {
        state.rpcCalls.push({ name, args });
        if (state.rpcErrors[name]) return { data: null, error: { message: state.rpcErrors[name] } };
        if (name === 'admin_listar_lojas') return { data: [loja], error: null };
        if (name === 'admin_criar_loja') return { data: lojaA, error: null };
        if (name === 'admin_listar_usuarios') return { data: [{ id: admin }, { id: outro, role: 'cliente' }, { id: novaConta, role: 'admin' }], error: null };
        if (name === 'admin_painel') return { data: { volume_bruto: 10 }, error: null };
        if (name === 'admin_buscar_conta') return { data: state.contaPorEmail ?? null, error: null };
        return { data: null, error: null };
      },
      storage: { from() {
        return {
          async upload() { return { error: null }; },
          getPublicUrl(path) { return { data: { publicUrl: `https://cdn.local/${path}` } }; }
        };
      } }
    }),
    createServiceClient: () => (state.semServico ? null : {
      auth: { admin: {
        async createUser(attrs) {
          state.criadas.push(attrs);
          return state.erroConta ? { data: { user: null }, error: state.erroConta } : { data: { user: { id: novaConta } }, error: null };
        },
        async deleteUser(id) { state.excluidas.push(id); return { error: null }; },
        async updateUserById(id, attrs) { state.atualizadas.push({ id, attrs }); return { error: null }; }
      } }
    }),
    async updateAuthUser() { return { ok: true, status: 200 }; }
  }
};
const app = require('../src/app').default;
const { cnpjValido } = require('../src/schemas/adminSchema');

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
    perfil: { role: 'admin', admin_permissoes: null },
    rpcCalls: [], rpcErrors: {}, criadas: [], excluidas: [], atualizadas: [],
    semServico: false, erroConta: null, cnpjEmUso: false, lojaExiste: true, contaPorEmail: null
  };
});

async function request(path, method = 'GET', body, token = 'ok') {
  const response = await fetch(base + path, {
    method,
    headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : null };
}

const novaLoja = { nome: 'Loja Nova', email: 'Dono@Loja.com', senha: 'senha12345', cnpj: CNPJ_VALIDO, telefone: '(47) 99999-0000', categoria: 'Outros' };

test('CNPJ: dígitos verificadores, máscara e formato alfanumérico', () => {
  assert.equal(cnpjValido('11.222.333/0001-81'), true);
  assert.equal(cnpjValido('11.222.333/0001-80'), false);
  assert.equal(cnpjValido('11111111111111'), false);
  assert.equal(cnpjValido('12.ABC.345/01DE-35'), true);
  assert.equal(cnpjValido('12abc34501de35'), true);
  assert.equal(cnpjValido('12.ABC.345/01DE-36'), false);
});

test('rotas do admin exigem login e papel de admin', async () => {
  assert.equal((await request('/api/admin/me', 'GET', undefined, null)).status, 401);
  state.perfil = { role: 'cliente' };
  for (const path of ['/api/admin/me', '/api/admin/painel', '/api/admin/lojas', '/api/admin/usuarios']) {
    assert.equal((await request(path)).status, 403, path);
  }
});

test('admin sem permissões gravadas tem todas; com permissões, só as dele', async () => {
  let r = await request('/api/admin/me');
  assert.deepEqual(r.body.permissoes, ['lojas', 'produtos', 'usuarios', 'relatorios']);
  state.perfil = { role: 'admin', admin_permissoes: ['relatorios'] };
  assert.equal((await request('/api/admin/painel')).status, 200);
  assert.equal((await request('/api/admin/lojas')).status, 403);
  assert.equal((await request('/api/admin/usuarios')).status, 403);
  assert.equal(state.rpcCalls.some(call => call.name === 'admin_listar_lojas'), false);
});

test('cadastro de loja valida dados antes de criar qualquer conta', async () => {
  for (const body of [
    { ...novaLoja, cnpj: '11.222.333/0001-80' },
    { ...novaLoja, telefone: '1234' },
    { ...novaLoja, categoria: 'Inventada' },
    { ...novaLoja, senha: 'curta' },
    { ...novaLoja, extra: true }
  ]) {
    assert.equal((await request('/api/admin/lojas', 'POST', body)).status, 400);
  }
  assert.equal(state.criadas.length, 0);
});

test('cadastro de loja cria a conta confirmada e vincula pela função do banco', async () => {
  const r = await request('/api/admin/lojas', 'POST', novaLoja);
  assert.equal(r.status, 201);
  assert.equal(state.criadas[0].email, 'dono@loja.com');
  assert.equal(state.criadas[0].email_confirm, true);
  const call = state.rpcCalls.find(item => item.name === 'admin_criar_loja');
  assert.equal(call.args.p_cnpj, '11222333000181');
  assert.equal(call.args.p_responsavel, novaConta);
});

test('se a loja não pode ser criada, a conta recém-criada é apagada', async () => {
  state.rpcErrors.admin_criar_loja = 'VC_CONFLICT: cnpj';
  const r = await request('/api/admin/lojas', 'POST', novaLoja);
  assert.equal(r.status, 409);
  assert.deepEqual(state.excluidas, [novaConta]);
});

test('CNPJ em uso e e-mail já cadastrado retornam 409', async () => {
  state.cnpjEmUso = true;
  assert.equal((await request('/api/admin/lojas', 'POST', novaLoja)).status, 409);
  assert.equal(state.criadas.length, 0);
  state.cnpjEmUso = false;
  state.erroConta = { message: 'A user with this email address has already been registered', status: 422, code: 'email_exists' };
  assert.equal((await request('/api/admin/lojas', 'POST', novaLoja)).status, 409);
});

test('sem a chave de serviço, cadastrar contas responde 503 com explicação', async () => {
  state.semServico = true;
  const r = await request('/api/admin/lojas', 'POST', novaLoja);
  assert.equal(r.status, 503);
  assert.match(r.body.erro, /chave de serviço/);
});

test('editar loja: e-mail do responsável muda pelo Auth; sem responsável vincula conta existente', async () => {
  let r = await request(`/api/admin/lojas/${lojaA}`, 'PATCH', { email: 'novo@x.com', ativa: false });
  assert.equal(r.status, 200);
  assert.deepEqual(state.atualizadas[0], { id: outro, attrs: { email: 'novo@x.com', email_confirm: true } });
  assert.deepEqual(state.rpcCalls.find(item => item.name === 'admin_atualizar_loja').args.p_dados, { ativa: false });

  loja.responsavel_id = null; loja.responsavel_email = null;
  r = await request(`/api/admin/lojas/${lojaA}`, 'PATCH', { email: 'semconta@x.com' });
  assert.equal(r.status, 404);
  state.contaPorEmail = novaConta;
  r = await request(`/api/admin/lojas/${lojaA}`, 'PATCH', { email: 'temconta@x.com' });
  assert.equal(r.status, 200);
  assert.equal(state.rpcCalls.filter(item => item.name === 'admin_atualizar_loja').pop().args.p_dados.responsavel, novaConta);
  loja.responsavel_id = outro; loja.responsavel_email = 'dono@x.com';
});

test('excluir loja com pedidos responde 409 com orientação', async () => {
  state.rpcErrors.admin_excluir_loja = 'VC_CONFLICT: pedidos';
  const r = await request(`/api/admin/lojas/${lojaA}`, 'DELETE');
  assert.equal(r.status, 409);
  assert.match(r.body.erro, /Desative/);
  delete state.rpcErrors.admin_excluir_loja;
  assert.equal((await request(`/api/admin/lojas/${lojaA}`, 'DELETE')).status, 204);
});

test('papéis: não muda o próprio; Admin recebe todas as permissões; erros do banco viram mensagens', async () => {
  assert.equal((await request(`/api/admin/usuarios/${admin}`, 'PATCH', { role: 'cliente' })).status, 403);
  assert.equal((await request(`/api/admin/usuarios/${outro}`, 'PATCH', { role: 'lojista' })).status, 400);
  let r = await request(`/api/admin/usuarios/${outro}`, 'PATCH', { role: 'admin', admin_tipo: 'Admin' });
  assert.equal(r.status, 200);
  assert.deepEqual(state.rpcCalls.find(item => item.name === 'admin_definir_papel').args.p_permissoes,
    ['lojas', 'produtos', 'usuarios', 'relatorios']);
  assert.equal((await request(`/api/admin/usuarios/${outro}`, 'PATCH', { role: 'admin', admin_tipo: 'Suporte' })).status, 400);
  state.rpcErrors.admin_definir_papel = 'VC_FORBIDDEN: superior';
  r = await request(`/api/admin/usuarios/${outro}`, 'PATCH', { role: 'cliente' });
  assert.equal(r.status, 403);
  assert.match(r.body.erro, /permissões/);
});

test('excluir usuário: valida no banco antes de apagar no Auth', async () => {
  state.rpcErrors.admin_validar_exclusao_usuario = 'VC_CONFLICT: pedidos';
  assert.equal((await request(`/api/admin/usuarios/${outro}`, 'DELETE')).status, 409);
  assert.equal(state.excluidas.length, 0);
  delete state.rpcErrors.admin_validar_exclusao_usuario;
  assert.equal((await request(`/api/admin/usuarios/${outro}`, 'DELETE')).status, 204);
  assert.deepEqual(state.excluidas, [outro]);
});

test('novo administrador não recebe permissão que quem cadastra não tem', async () => {
  state.perfil = { role: 'admin', admin_permissoes: ['usuarios'] };
  const base = { nome: 'Novo Admin', email: 'novo@admin.com', senha: 'senha12345' };
  assert.equal((await request('/api/admin/administradores', 'POST', { ...base, admin_tipo: 'Admin' })).status, 403);
  assert.equal((await request('/api/admin/administradores', 'POST', { ...base, admin_tipo: 'Gerente', admin_permissoes: ['lojas'] })).status, 403);
  assert.equal(state.criadas.length, 0);
  const r = await request('/api/admin/administradores', 'POST', { ...base, admin_tipo: 'Suporte', admin_permissoes: ['usuarios'] });
  assert.equal(r.status, 201);
  assert.equal(state.criadas.length, 1);
});

test('envio de logo pelo admin aceita só imagem e loja existente', async () => {
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]);
  const send = (body) => fetch(`${base}/api/admin/lojas/${lojaA}/imagens?tipo=logo`, {
    method: 'POST', headers: { Authorization: 'Bearer ok', 'Content-Type': 'image/png' }, body
  });
  assert.equal((await send(Buffer.from('texto'))).status, 400);
  assert.equal((await send(png)).status, 201);
  state.lojaExiste = false;
  assert.equal((await send(png)).status, 404);
});
