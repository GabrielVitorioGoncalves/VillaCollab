// Só contra um ambiente de teste: cria e apaga contas, lojas e pedidos.
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';

const API = process.env.API_URL ?? 'http://localhost:3333/api';
const REST = `${process.env.SUPABASE_URL ?? 'http://localhost:54321'}/rest/v1`;
const ANON = process.env.SUPABASE_ANON_KEY;
const DB = process.env.DATABASE_URL;
if (!ANON || !DB) throw new Error('Defina SUPABASE_ANON_KEY e DATABASE_URL');

const sql = (query) => execFileSync('psql', [DB, '-v', 'ON_ERROR_STOP=1', '-tAq', '-c', query], { encoding: 'utf8' }).trim();
const run = Date.now().toString(36);
const results = [];

async function api(path, { method = 'GET', body, token, raw, type } = {}) {
  const response = await fetch(API + path, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(raw ? { 'Content-Type': type } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: raw ?? (body ? JSON.stringify(body) : undefined)
  });
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : null };
}

async function rest(path, { method = 'GET', body, token } = {}) {
  const response = await fetch(REST + path, {
    method,
    headers: { apikey: ANON, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : null };
}

async function register(nome) {
  const email = `${nome}.${run}@teste.local`;
  const r = await api('/auth/register', { method: 'POST', body: { nome, email, password: 'senha12345' } });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  return { id: r.body.id, email };
}
async function login(email, password = 'senha12345') {
  const r = await api('/auth/login', { method: 'POST', body: { email, password } });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  return r.body.access_token;
}
async function step(name, fn) {
  try { await fn(); results.push(`ok   ${name}`); }
  catch (error) { results.push(`FAIL ${name}: ${error.message.split('\n')[0]}`); }
}

function cnpj(base12) {
  const dv = (base) => {
    let peso = 2; let soma = 0;
    for (let i = base.length - 1; i >= 0; i--) { soma += (base.charCodeAt(i) - 48) * peso; peso = peso === 9 ? 2 : peso + 1; }
    const resto = soma % 11; return resto < 2 ? 0 : 11 - resto;
  };
  const d1 = dv(base12); const d2 = dv(base12 + d1);
  return `${base12}${d1}${d2}`;
}
const numero = () => String(Math.floor(Math.random() * 1e12)).padStart(12, '7');

const superAdmin = await register('superadmin');
const cliente = await register('cliente');
sql(`update usuarios set role = 'admin' where id = '${superAdmin.id}'`);
const tSuper = await login(superAdmin.email);
const tCliente = await login(cliente.email);

let lojaA;
let lojistaA;
const cnpjA = cnpj(numero());

await step('sem login 401; cliente 403 em todas as rotas do admin', async () => {
  assert.equal((await api('/admin/me')).status, 401);
  for (const path of ['/admin/me', '/admin/painel', '/admin/lojas', '/admin/usuarios']) {
    assert.equal((await api(path, { token: tCliente })).status, 403, path);
  }
  assert.equal((await api('/admin/lojas', { method: 'POST', token: tCliente, body: {} })).status, 400);
});

await step('admin antigo (sem permissões gravadas) tem acesso completo', async () => {
  const r = await api('/admin/me', { token: tSuper });
  assert.equal(r.status, 200);
  assert.deepEqual(r.body.permissoes, ['lojas', 'produtos', 'usuarios', 'relatorios']);
});

await step('cadastro de loja valida CNPJ, telefone e categoria', async () => {
  const base = { nome: `Loja Admin ${run}`, email: `dono.${run}@teste.local`, senha: 'senha12345', telefone: '(47) 99999-0000', categoria: 'Eletrônicos' };
  let r = await api('/admin/lojas', { method: 'POST', token: tSuper, body: { ...base, cnpj: '11.111.111/1111-11' } });
  assert.equal(r.status, 400);
  r = await api('/admin/lojas', { method: 'POST', token: tSuper, body: { ...base, cnpj: cnpjA, telefone: '123' } });
  assert.equal(r.status, 400);
  r = await api('/admin/lojas', { method: 'POST', token: tSuper, body: { ...base, cnpj: cnpjA, categoria: 'Qualquer' } });
  assert.equal(r.status, 400);
  assert.equal(sql(`select count(*) from auth.users where email = 'dono.${run}@teste.local'`), '0');
});

await step('cadastra loja com conta do lojista; o lojista entra e vê a própria loja', async () => {
  const r = await api('/admin/lojas', { method: 'POST', token: tSuper, body: {
    nome: `Loja Admin ${run}`, email: `Dono.${run}@teste.local`, senha: 'senha12345',
    cnpj: `${cnpjA.slice(0, 2)}.${cnpjA.slice(2, 5)}.${cnpjA.slice(5, 8)}/${cnpjA.slice(8, 12)}-${cnpjA.slice(12)}`,
    telefone: '(47) 99999-0000', categoria: 'Eletrônicos'
  } });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  lojaA = r.body.id;
  assert.equal(r.body.cnpj, cnpjA);
  assert.equal(r.body.responsavel_email, `dono.${run}@teste.local`);
  assert.equal(r.body.ativa, true);
  lojistaA = r.body.responsavel_id;
  const t = await login(`dono.${run}@teste.local`);
  const minha = await api('/minha-loja', { token: t });
  assert.equal(minha.status, 200);
  assert.equal(minha.body.id, lojaA);
});

await step('CNPJ alfanumérico é aceito', async () => {
  const alfa = cnpj(`12ABC345${numero().slice(0, 2)}DE`);
  const r = await api('/admin/lojas', { method: 'POST', token: tSuper, body: {
    nome: `Loja Alfa ${run}`, email: `alfa.${run}@teste.local`, senha: 'senha12345', cnpj: alfa.toLowerCase(),
    telefone: '4733334444', categoria: 'Outros' } });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  assert.equal(r.body.cnpj, alfa);
});

await step('CNPJ e e-mail repetidos dão 409 e não deixam conta ou loja pela metade', async () => {
  let r = await api('/admin/lojas', { method: 'POST', token: tSuper, body: {
    nome: 'Outra', email: `outra.${run}@teste.local`, senha: 'senha12345', cnpj: cnpjA, telefone: '4733334444', categoria: 'Outros' } });
  assert.equal(r.status, 409);
  assert.equal(sql(`select count(*) from auth.users where email = 'outra.${run}@teste.local'`), '0');
  r = await api('/admin/lojas', { method: 'POST', token: tSuper, body: {
    nome: 'Outra', email: cliente.email, senha: 'senha12345', cnpj: cnpj(numero()), telefone: '4733334444', categoria: 'Outros' } });
  assert.equal(r.status, 409);
  assert.equal(sql(`select count(*) from lojas where nome = 'Outra'`), '0');
});

let produtoA;
await step('loja desativada some da vitrine e não recebe pedido; reativada volta', async () => {
  produtoA = sql(`insert into produtos (loja_id, nome, preco, estoque) values ('${lojaA}', 'Produto ${run}', 100, 10) returning id`);
  let r = await api(`/admin/lojas/${lojaA}`, { method: 'PATCH', token: tSuper, body: { ativa: false } });
  assert.equal(r.status, 200);
  assert.equal(r.body.ativa, false);
  const vitrine = await api('/lojas');
  assert.ok(!vitrine.body.some(loja => loja.id === lojaA));
  r = await api('/pedidos', { method: 'POST', token: tCliente, body: { loja_id: lojaA, itens: [{ produto_id: produtoA, quantidade: 1 }] } });
  assert.equal(r.status, 409);
  assert.equal(sql(`select estoque from produtos where id = '${produtoA}'`), '10');
  r = await api(`/admin/lojas/${lojaA}`, { method: 'PATCH', token: tSuper, body: { ativa: true, nome: `Loja Admin Editada ${run}`, telefone: '(47) 3333-2222', categoria: 'Esportes' } });
  assert.equal(r.status, 200);
  assert.equal(r.body.nome, `Loja Admin Editada ${run}`);
  r = await api('/pedidos', { method: 'POST', token: tCliente, body: { loja_id: lojaA, itens: [{ produto_id: produtoA, quantidade: 2 }] } });
  assert.equal(r.status, 201, JSON.stringify(r.body));
});

await step('lojista não muda CNPJ nem status da própria loja (API e Supabase direto)', async () => {
  const t = await login(`dono.${run}@teste.local`);
  let r = await api(`/lojas/${lojaA}`, { method: 'PATCH', token: t, body: { ativa: false } });
  assert.equal(r.status, 400);
  r = await rest(`/lojas?id=eq.${lojaA}`, { method: 'PATCH', token: t, body: { ativa: false, cnpj: cnpj(numero()) } });
  assert.notEqual(r.status, 200);
  assert.equal(sql(`select ativa from lojas where id = '${lojaA}'`), 't');
});

await step('trocar o e-mail do responsável muda o login dele', async () => {
  const r = await api(`/admin/lojas/${lojaA}`, { method: 'PATCH', token: tSuper, body: { email: `novo.dono.${run}@teste.local` } });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.responsavel_email, `novo.dono.${run}@teste.local`);
  await login(`novo.dono.${run}@teste.local`);
});

await step('envio de logo: só imagem válida passa da validação', async () => {
  const r = await api(`/admin/lojas/${lojaA}/imagens?tipo=logo`, { method: 'POST', token: tSuper, raw: Buffer.from('nao e imagem'), type: 'image/png' });
  assert.equal(r.status, 400);
  const c = await api(`/admin/lojas/${lojaA}/imagens?tipo=logo`, { method: 'POST', token: tCliente, raw: Buffer.from('x'), type: 'image/png' });
  assert.equal(c.status, 403);
});

await step('painel com números do banco', async () => {
  const r = await api('/admin/painel', { token: tSuper });
  assert.equal(r.status, 200);
  const volume = Number(sql(`select coalesce(sum(total),0) from pedidos where status <> 'cancelado' and created_at >= date_trunc('month', now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo'`));
  assert.equal(Number(r.body.volume_bruto), volume);
  assert.equal(r.body.lojas_ativas, Number(sql('select count(*) from lojas where ativa')));
  assert.equal(r.body.ultimos_dias.length, 7);
  const ranking = r.body.ranking_lojas.find(loja => loja.id === lojaA);
  assert.equal(Number(ranking.faturamento), 200);
  assert.equal(r.body.pedidos_recentes[0].cliente, cliente.email);
  assert.equal(typeof r.body.alertas.lojas_sem_responsavel, 'number');
});

await step('lista de usuários traz e-mail, papel, loja e marca a própria conta', async () => {
  const r = await api('/admin/usuarios', { token: tSuper });
  assert.equal(r.status, 200);
  const eu = r.body.find(u => u.id === superAdmin.id);
  assert.equal(eu.voce, true);
  assert.equal(eu.email, superAdmin.email);
  const dono = r.body.find(u => u.id === lojistaA);
  assert.equal(dono.role, 'lojista');
  assert.equal(dono.loja_id, lojaA);
  assert.equal(dono.mfa, false);
});

let suporte;
let tSuporte;
await step('promove cliente a admin Suporte só com relatórios; ele vê o painel e nada mais', async () => {
  suporte = await register('suporte');
  const r = await api(`/admin/usuarios/${suporte.id}`, { method: 'PATCH', token: tSuper,
    body: { role: 'admin', admin_tipo: 'Suporte', admin_permissoes: ['relatorios'] } });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.deepEqual(r.body.admin_permissoes, ['relatorios']);
  tSuporte = await login(suporte.email);
  assert.equal((await api('/admin/painel', { token: tSuporte })).status, 200);
  assert.equal((await api('/admin/lojas', { token: tSuporte })).status, 403);
  assert.equal((await api('/admin/usuarios', { token: tSuporte })).status, 403);
  assert.equal((await api(`/usuarios/${cliente.id}/vinculo`, { method: 'PATCH', token: tSuporte, body: { role: 'lojista', loja_id: lojaA } })).status, 403);
});

await step('admin sem permissão não contorna pelo Supabase direto', async () => {
  let r = await rest(`/usuarios?id=eq.${cliente.id}`, { method: 'PATCH', token: tSuporte, body: { role: 'admin' } });
  assert.ok(r.status !== 200 || r.body.length === 0, JSON.stringify(r.body));
  r = await rest(`/usuarios?id=eq.${suporte.id}`, { method: 'PATCH', token: tSuporte, body: { admin_permissoes: ['lojas', 'usuarios'] } });
  assert.ok(r.status !== 200 || r.body.length === 0);
  r = await rest(`/lojas?id=eq.${lojaA}`, { method: 'PATCH', token: tSuporte, body: { nome: 'hack' } });
  assert.ok(r.status !== 200 || r.body.length === 0);
  r = await rest('/rpc/admin_listar_usuarios', { method: 'POST', token: tSuporte, body: {} });
  assert.notEqual(r.status, 200);
  r = await rest(`/usuarios?id=eq.${cliente.id}`, { method: 'DELETE', token: tSuper });
  assert.notEqual(r.status, 200);
  assert.equal(sql(`select role from usuarios where id = '${cliente.id}'`), 'cliente');
  assert.equal(sql(`select array_to_string(admin_permissoes, ',') from usuarios where id = '${suporte.id}'`), 'relatorios');
});

let gerente;
let tGerente;
await step('Gerente com usuários não cria admin mais forte nem mexe no admin principal', async () => {
  const r = await api('/admin/administradores', { method: 'POST', token: tSuper, body: {
    nome: 'Gerente Teste', email: `gerente.${run}@teste.local`, senha: 'senha12345', admin_tipo: 'Gerente', admin_permissoes: ['usuarios'] } });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  gerente = r.body;
  tGerente = await login(`gerente.${run}@teste.local`);
  assert.deepEqual((await api('/admin/me', { token: tGerente })).body.permissoes, ['usuarios']);
  let x = await api('/admin/administradores', { method: 'POST', token: tGerente, body: {
    nome: 'Admin Novo', email: `forte.${run}@teste.local`, senha: 'senha12345', admin_tipo: 'Admin' } });
  assert.equal(x.status, 403);
  assert.equal(sql(`select count(*) from auth.users where email = 'forte.${run}@teste.local'`), '0');
  x = await api(`/admin/usuarios/${superAdmin.id}`, { method: 'PATCH', token: tGerente, body: { role: 'cliente' } });
  assert.equal(x.status, 403);
  x = await api(`/admin/usuarios/${cliente.id}`, { method: 'PATCH', token: tGerente, body: { role: 'admin', admin_tipo: 'Admin' } });
  assert.equal(x.status, 403);
  x = await api(`/admin/usuarios/${cliente.id}`, { method: 'PATCH', token: tGerente, body: { role: 'admin', admin_tipo: 'Suporte', admin_permissoes: ['usuarios'] } });
  assert.equal(x.status, 200);
  x = await api(`/admin/usuarios/${cliente.id}`, { method: 'PATCH', token: tGerente, body: { role: 'cliente' } });
  assert.equal(x.status, 200);
  assert.equal(sql(`select role || coalesce(admin_tipo, '-') from usuarios where id = '${cliente.id}'`), 'cliente-');
});

await step('ninguém altera o próprio papel', async () => {
  const r = await api(`/admin/usuarios/${gerente.id}`, { method: 'PATCH', token: tGerente, body: { role: 'admin', admin_tipo: 'Gerente', admin_permissoes: ['usuarios', 'lojas'] } });
  assert.equal(r.status, 403);
  const direto = await rest(`/usuarios?id=eq.${gerente.id}`, { method: 'PATCH', token: tGerente, body: { admin_permissoes: ['usuarios', 'lojas'] } });
  assert.ok(direto.status !== 200 || direto.body.length === 0);
});

await step('lojista: exige loja; trocar papel desvincula', async () => {
  let r = await api(`/admin/usuarios/${cliente.id}`, { method: 'PATCH', token: tSuper, body: { role: 'lojista' } });
  assert.equal(r.status, 400);
  r = await api(`/admin/usuarios/${cliente.id}`, { method: 'PATCH', token: tSuper, body: { role: 'lojista', loja_id: lojaA } });
  assert.equal(r.status, 200);
  assert.equal(r.body.loja_id, lojaA);
  r = await api(`/admin/usuarios/${cliente.id}`, { method: 'PATCH', token: tSuper, body: { role: 'cliente' } });
  assert.equal(r.body.loja_id, null);
});

await step('excluir usuário: com pedidos 409; sem pedidos some do Auth; não exclui a si mesmo', async () => {
  assert.equal((await api(`/admin/usuarios/${cliente.id}`, { method: 'DELETE', token: tSuper })).status, 409);
  assert.equal((await api(`/admin/usuarios/${superAdmin.id}`, { method: 'DELETE', token: tSuper })).status, 403);
  assert.equal((await api(`/admin/usuarios/${superAdmin.id}`, { method: 'DELETE', token: tGerente })).status, 403);
  const descartavel = await register('descartavel');
  assert.equal((await api(`/admin/usuarios/${descartavel.id}`, { method: 'DELETE', token: tSuper })).status, 204);
  assert.equal(sql(`select count(*) from auth.users where id = '${descartavel.id}'`), '0');
  assert.equal(sql(`select count(*) from pedidos where usuario_id = '${cliente.id}'`), '1');
});

await step('excluir loja: com pedidos 409; sem pedidos remove e devolve o lojista a cliente', async () => {
  assert.equal((await api(`/admin/lojas/${lojaA}`, { method: 'DELETE', token: tSuper })).status, 409);
  const r = await api('/admin/lojas', { method: 'POST', token: tSuper, body: {
    nome: `Loja Temporaria ${run}`, email: `temp.${run}@teste.local`, senha: 'senha12345', cnpj: cnpj(numero()), telefone: '4733334444', categoria: 'Outros' } });
  assert.equal(r.status, 201);
  const temp = r.body;
  assert.equal((await api(`/admin/lojas/${temp.id}`, { method: 'DELETE', token: tSuper })).status, 204);
  assert.equal(sql(`select count(*) from lojas where id = '${temp.id}'`), '0');
  assert.equal(sql(`select role || coalesce(loja_id::text, '-') from usuarios where id = '${temp.responsavel_id}'`), 'cliente-');
});

await step('rota antiga /usuarios/:id/vinculo continua funcionando para admin completo', async () => {
  const r = await api(`/usuarios/${cliente.id}/vinculo`, { method: 'PATCH', token: tSuper, body: { role: 'lojista', loja_id: lojaA } });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  await api(`/usuarios/${cliente.id}/vinculo`, { method: 'PATCH', token: tSuper, body: { role: 'cliente', loja_id: null } });
});

console.log(results.join('\n'));
const falhas = results.filter(r => r.startsWith('FAIL')).length;
console.log(`\n${results.length - falhas} ok, ${falhas} falha(s)`);
process.exit(falhas ? 1 : 0);
