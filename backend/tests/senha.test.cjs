const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');

const usuario = '33333333-3333-4333-8333-333333333333';
const fatorId = '77777777-7777-4777-8777-777777777777';
const agora = () => Math.floor(Date.now() / 1000);
const token = ({ aal = 'aal1', metodo = 'otp', quando = agora() } = {}) =>
  `cabecalho.${Buffer.from(JSON.stringify({ aal, amr: [{ method: metodo, timestamp: quando }] })).toString('base64url')}.assinatura`;
const DO_LINK = token();
const DO_LINK_AAL2 = token({ aal: 'aal2' });
let state;
let server;
let base;

const configPath = require.resolve('../src/config/supabase');
require.cache[configPath] = {
  id: configPath, filename: configPath, loaded: true,
  exports: {
    supabase: {
      auth: {
        async getUser(recebido) {
          return { data: { user: {
            id: usuario, email: 'maria@teste.com',
            app_metadata: { trocar_senha: state.trocarSenha },
            factors: state.comMfa ? [{ id: fatorId, factor_type: 'totp', status: 'verified' }] : []
          } }, error: recebido ? null : { message: 'sem token' } };
        }
      }
    },
    createSupabaseClient: () => ({
      auth: {
        async resetPasswordForEmail(email, opcoes) {
          state.recuperacoes.push({ email, opcoes });
          return { data: {}, error: state.erroRecuperacao };
        }
      }
    }),
    createServiceClient: () => ({
      auth: { admin: {
        async updateUserById(id, attrs) { state.servico.push({ id, attrs }); return { error: null }; }
      } }
    }),
    async signOutSession(recebido, escopo) { state.saidas.push({ token: recebido, escopo }); return { ok: true, status: 204 }; },
    async updateAuthUser(recebido, attrs) {
      state.atualizacoes.push({ token: recebido, attrs });
      return { ok: state.statusAtualizacao < 300, status: state.statusAtualizacao };
    },
    async requisicaoAuth(_token, method, caminho, corpo) {
      if (method === 'GET' && caminho === '/user') {
        return { ok: true, status: 200, dados: { factors: [{ id: fatorId, factor_type: 'totp', status: 'verified' }] } };
      }
      if (caminho.endsWith('/challenge')) return { ok: true, status: 200, dados: { id: 'desafio' } };
      if (caminho.endsWith('/verify')) {
        return corpo.code === '123456'
          ? { ok: true, status: 200, dados: { access_token: DO_LINK_AAL2, refresh_token: 'r', expires_at: 1 } }
          : { ok: false, status: 422, dados: {} };
      }
      return { ok: true, status: 204, dados: null };
    }
  }
};
const fetchReal = globalThis.fetch;
globalThis.fetch = async (url, opcoes) => {
  if (String(url).startsWith('https://challenges.cloudflare.com/')) {
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
    trocarSenha: false, comMfa: false, erroRecuperacao: null, statusAtualizacao: 200,
    recuperacoes: [], atualizacoes: [], saidas: [], servico: []
  };
});

async function request(path, { method = 'POST', body, auth, origem, ip } = {}) {
  const response = await fetch(base + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(auth ? { Authorization: `Bearer ${auth}` } : {}),
      ...(origem ? { Origin: origem } : {}),
      ...(ip ? { 'CF-Connecting-IP': ip } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : null };
}

test('pedido de recuperação responde igual para qualquer e-mail e manda o link para a página certa', async () => {
  const resposta = await request('/api/auth/senha/recuperar', {
    body: { email: 'maria@teste.com' }, origem: 'http://localhost:4173', ip: '10.0.0.1'
  });
  assert.equal(resposta.status, 202);
  assert.match(resposta.body.mensagem, /Se existir uma conta/);
  assert.deepEqual(state.recuperacoes, [{
    email: 'maria@teste.com', opcoes: { redirectTo: 'http://localhost:4173/redefinir-senha' }
  }]);
});

test('origem desconhecida não entra no link do e-mail', async () => {
  await request('/api/auth/senha/recuperar', {
    body: { email: 'ana@teste.com' }, origem: 'https://golpe.example', ip: '10.0.0.2'
  });
  assert.equal(state.recuperacoes[0].opcoes, undefined);
});

test('limite do Supabase não revela se a conta existe; falha do servidor de e-mail avisa', async () => {
  state.erroRecuperacao = { status: 429, message: 'rate limit' };
  assert.equal((await request('/api/auth/senha/recuperar', { body: { email: 'joao@teste.com' }, ip: '10.0.0.3' })).status, 202);
  state.erroRecuperacao = { status: 500, message: 'smtp' };
  const falha = await request('/api/auth/senha/recuperar', { body: { email: 'joao2@teste.com' }, ip: '10.0.0.3' });
  assert.equal(falha.status, 503);
  assert.match(falha.body.erro, /Não foi possível enviar o e-mail/);
});

test('recuperação valida e-mail, exige captcha quando ativo e limita repetições', async () => {
  assert.equal((await request('/api/auth/senha/recuperar', { body: { email: 'nao-e-email' }, ip: '10.0.0.4' })).status, 400);
  process.env.TURNSTILE_SECRET_KEY = 'segredo';
  const semCaptcha = await request('/api/auth/senha/recuperar', { body: { email: 'bia@teste.com' }, ip: '10.0.0.4' });
  assert.equal(semCaptcha.status, 400);
  assert.equal(semCaptcha.body.codigo, 'captcha');
  assert.equal((await request('/api/auth/senha/recuperar', {
    body: { email: 'bia@teste.com', captcha_token: 'bom' }, ip: '10.0.0.4'
  })).status, 202);
  delete process.env.TURNSTILE_SECRET_KEY;
  for (let i = 0; i < 4; i += 1) {
    await request('/api/auth/senha/recuperar', { body: { email: 'BIA@teste.com' }, ip: `10.0.1.${i}` });
  }
  const bloqueado = await request('/api/auth/senha/recuperar', { body: { email: 'bia@teste.com' }, ip: '10.0.2.1' });
  assert.equal(bloqueado.status, 429);
});

test('nova senha só é aceita com a sessão aberta pelo link do e-mail', async () => {
  const comSenha = await request('/api/auth/senha/redefinir', {
    auth: token({ metodo: 'password' }), body: { nova_senha: 'nova-senha-123' }
  });
  assert.equal(comSenha.status, 403);
  const antigo = await request('/api/auth/senha/redefinir', {
    auth: token({ quando: agora() - 2 * 60 * 60 }), body: { nova_senha: 'nova-senha-123' }
  });
  assert.equal(antigo.status, 403);
  assert.equal((await request('/api/auth/senha/redefinir', { body: { nova_senha: 'nova-senha-123' } })).status, 401);
  assert.equal(state.atualizacoes.length, 0);
});

test('link válido troca a senha e encerra todas as sessões', async () => {
  const curta = await request('/api/auth/senha/redefinir', { auth: DO_LINK, body: { nova_senha: '123' } });
  assert.equal(curta.status, 400);
  const resposta = await request('/api/auth/senha/redefinir', { auth: DO_LINK, body: { nova_senha: 'nova-senha-123' } });
  assert.equal(resposta.status, 204);
  assert.deepEqual(state.atualizacoes, [{ token: DO_LINK, attrs: { password: 'nova-senha-123' } }]);
  assert.deepEqual(state.saidas, [{ token: DO_LINK, escopo: 'global' }]);
});

test('senha igual à anterior recebe mensagem clara', async () => {
  state.statusAtualizacao = 422;
  const resposta = await request('/api/auth/senha/redefinir', { auth: DO_LINK, body: { nova_senha: 'nova-senha-123' } });
  assert.equal(resposta.status, 400);
  assert.match(resposta.body.erro, /diferente da anterior/);
  assert.equal(state.saidas.length, 0);
});

test('conta com verificação em duas etapas precisa do código do aplicativo', async () => {
  state.comMfa = true;
  const semCodigo = await request('/api/auth/senha/redefinir', { auth: DO_LINK, body: { nova_senha: 'nova-senha-123' } });
  assert.equal(semCodigo.status, 403);
  assert.equal(semCodigo.body.codigo, 'mfa_codigo');
  const errado = await request('/api/auth/senha/redefinir', {
    auth: DO_LINK, body: { nova_senha: 'nova-senha-123', codigo: '000000' }
  });
  assert.equal(errado.status, 400);
  assert.equal(state.atualizacoes.length, 0);
  const certo = await request('/api/auth/senha/redefinir', {
    auth: DO_LINK, body: { nova_senha: 'nova-senha-123', codigo: '123456' }
  });
  assert.equal(certo.status, 204);
  assert.equal(state.atualizacoes[0].token, DO_LINK_AAL2);
});

test('conta com senha provisória pode redefinir pelo link e fica liberada', async () => {
  state.trocarSenha = true;
  const resposta = await request('/api/auth/senha/redefinir', { auth: DO_LINK, body: { nova_senha: 'nova-senha-123' } });
  assert.equal(resposta.status, 204);
  assert.deepEqual(state.servico, [{ id: usuario, attrs: { app_metadata: { trocar_senha: false } } }]);
});

test('pedidos sem captcha não gastam o limite do e-mail de outra pessoa', async () => {
  process.env.TURNSTILE_SECRET_KEY = 'segredo';
  for (let i = 0; i < 8; i += 1) {
    const r = await request('/api/auth/senha/recuperar', { body: { email: 'carla@teste.com' }, ip: `10.0.3.${i}` });
    assert.equal(r.status, 400);
  }
  const dona = await request('/api/auth/senha/recuperar', {
    body: { email: 'carla@teste.com', captcha_token: 'bom' }, ip: '10.0.4.1'
  });
  assert.equal(dona.status, 202);
});
