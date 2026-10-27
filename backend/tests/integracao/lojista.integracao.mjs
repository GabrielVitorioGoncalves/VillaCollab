import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';

const API = process.env.API_URL ?? 'http://localhost:3333/api';
const REST = `${process.env.SUPABASE_URL ?? 'http://localhost:54321'}/rest/v1`;
const ANON = process.env.SUPABASE_ANON_KEY;
const DB = process.env.DATABASE_URL;
if (!ANON || !DB) throw new Error('Defina SUPABASE_ANON_KEY e DATABASE_URL');

const sql = (query) => execFileSync('psql', [DB, '-v', 'ON_ERROR_STOP=1', '-tAq', '-c', query], { encoding: 'utf8' }).trim();
const run = Date.now().toString(36);
const results = [];

async function api(path, { method = 'GET', body, token, headers = {} } = {}) {
  const response = await fetch(API + path, {
    method,
    headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers },
    body: body ? JSON.stringify(body) : undefined
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

async function user(nome) {
  const email = `${nome}.${run}@teste.local`;
  const reg = await api('/auth/register', { method: 'POST', body: { nome, email, password: 'senha12345' } });
  assert.equal(reg.status, 201, JSON.stringify(reg.body));
  return { id: reg.body.id, email };
}
async function login(u) {
  const r = await api('/auth/login', { method: 'POST', body: { email: u.email, password: 'senha12345' } });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  return r.body.access_token;
}
async function step(name, fn) {
  try { await fn(); results.push(`ok   ${name}`); }
  catch (error) { results.push(`FAIL ${name}: ${error.message.split('\n')[0]}`); }
}

const lojaA = sql(`insert into lojas (nome, slug, descricao) values ('Loja A ${run}', 'loja-a-${run}', 'Teste') returning id`);
const lojaB = sql(`insert into lojas (nome, slug, descricao) values ('Loja B ${run}', 'loja-b-${run}', 'Teste') returning id`);
const prodA = sql(`insert into produtos (loja_id, nome, preco, estoque) values ('${lojaA}', 'Produto A', 50, 10) returning id`);
const prodB = sql(`insert into produtos (loja_id, nome, preco, estoque) values ('${lojaB}', 'Produto B', 80, 10) returning id`);
const uLojistaA = await user('lojistaA');
const uLojistaB = await user('lojistaB');
const uCliente = await user('cliente');
sql(`update usuarios set role = 'lojista', loja_id = '${lojaA}' where id = '${uLojistaA.id}'`);
sql(`update usuarios set role = 'lojista', loja_id = '${lojaB}' where id = '${uLojistaB.id}'`);
const tA = await login(uLojistaA);
const tB = await login(uLojistaB);
const tC = await login(uCliente);
const order = (loja, produto, quantidade = 1, extra = {}) =>
  api('/pedidos', { method: 'POST', token: tC, body: { loja_id: loja, itens: [{ produto_id: produto, quantidade }] }, ...extra });

await step('sem login: 401 nas rotas do lojista', async () => {
  for (const path of ['/minha-loja', '/minha-loja/produtos', '/minha-loja/pedidos']) {
    assert.equal((await api(path)).status, 401);
  }
});
await step('cliente: 403 na área do lojista', async () => {
  assert.equal((await api('/minha-loja', { token: tC })).status, 403);
  assert.equal((await api('/minha-loja/pedidos', { token: tC })).status, 403);
});
await step('lojista A vê só a própria loja e os próprios produtos', async () => {
  assert.equal((await api(`/minha-loja?loja_id=${lojaB}`, { token: tA })).body.id, lojaA);
  const produtos = (await api('/minha-loja/produtos', { token: tA })).body.map(p => p.id);
  assert.deepEqual(produtos, [prodA]);
  assert.equal((await api(`/minha-loja/produtos/${prodB}`, { token: tA })).status, 404);
});

let novo;
await step('lojista A cadastra, edita, ajusta estoque e desativa produto', async () => {
  const criado = await api('/produtos', { method: 'POST', token: tA, body: { loja_id: lojaA, nome: 'Novo produto', preco: 19.9, categoria: 'Casa' } });
  assert.equal(criado.status, 201);
  novo = criado.body.id;
  assert.equal((await api(`/produtos/${novo}/estoque`, { method: 'PATCH', token: tA, body: { estoque: 3 } })).body.estoque, 3);
  assert.equal((await api(`/produtos/${novo}`, { method: 'PATCH', token: tA, body: { preco: 21.5, preco_antigo: 25 } })).body.preco, 21.5);
  assert.equal((await api(`/produtos/${novo}`, { method: 'PATCH', token: tA, body: { ativo: false } })).body.ativo, false);
  const vitrine = (await api(`/produtos/loja/${lojaA}`)).body.map(p => p.id);
  assert.ok(!vitrine.includes(novo), 'inativo aparece na vitrine');
  assert.ok((await api('/minha-loja/produtos', { token: tA })).body.some(p => p.id === novo));
  assert.deepEqual((await order(lojaA, novo)).body, { erro: 'Produto indisponível' });
  await api(`/produtos/${novo}`, { method: 'PATCH', token: tA, body: { ativo: true } });
});
await step('lojista A não mexe em produto, estoque ou loja de B (backend)', async () => {
  assert.equal((await api('/produtos', { method: 'POST', token: tA, body: { loja_id: lojaB, nome: 'Invasor', preco: 1 } })).status, 403);
  assert.equal((await api(`/produtos/${prodB}`, { method: 'PATCH', token: tA, body: { preco: 1 } })).status, 403);
  assert.equal((await api(`/produtos/${prodB}/estoque`, { method: 'PATCH', token: tA, body: { estoque: 0 } })).status, 403);
  assert.equal((await api(`/produtos/${prodB}`, { method: 'DELETE', token: tA })).status, 403);
  assert.equal((await api(`/lojas/${lojaB}`, { method: 'PATCH', token: tA, body: { aceita_pedidos: false } })).status, 403);
  assert.equal(sql(`select preco::text || '/' || estoque from produtos where id = '${prodB}'`), '80.00/10');
});
await step('lojista A não mexe em B nem forja nota (acesso direto ao Supabase)', async () => {
  const r1 = await rest(`/produtos?id=eq.${prodB}`, { method: 'PATCH', token: tA, body: { preco: 1 } });
  assert.deepEqual(r1.body, []);
  const r2 = await rest(`/produtos?id=eq.${prodA}`, { method: 'PATCH', token: tA, body: { nota_media: 5, total_avaliacoes: 99 } });
  assert.equal(r2.status, 403, JSON.stringify(r2.body));
  const r3 = await rest(`/lojas?id=eq.${lojaB}`, { method: 'PATCH', token: tA, body: { nome: 'Hack' } });
  assert.deepEqual(r3.body, []);
  const r4 = await rest('/rpc/clientes_da_loja', { method: 'POST', token: tA, body: { p_loja_id: lojaB } });
  assert.match(JSON.stringify(r4.body), /VC_FORBIDDEN/);
  const r5 = await rest('/usuarios?select=id', { token: tA });
  assert.deepEqual(r5.body.map(u => u.id), [uLojistaA.id]);
});

let pedA; let pedB;
await step('cliente compra nas duas lojas; cada lojista vê só o seu pedido, com dados do cliente', async () => {
  pedA = (await order(lojaA, prodA, 2)).body.id;
  pedB = (await order(lojaB, prodB, 1)).body.id;
  const listaA = (await api('/minha-loja/pedidos', { token: tA })).body;
  assert.deepEqual(listaA.map(p => p.id), [pedA]);
  assert.equal(listaA[0].cliente.email, uCliente.email);
  assert.equal(listaA[0].itens_pedido[0].produtos.nome, 'Produto A');
  assert.equal(Number(listaA[0].total), 100);
  assert.deepEqual((await api('/minha-loja/pedidos', { token: tB })).body.map(p => p.id), [pedB]);
  assert.equal((await api(`/minha-loja/pedidos/${pedB}`, { token: tA })).status, 404);
  assert.equal((await api(`/pedidos/${pedB}`, { token: tA })).status, 404);
});
await step('fluxo de status: aceito -> enviado -> concluido, com regras', async () => {
  const set = (id, status, token) => api(`/pedidos/${id}/status`, { method: 'PATCH', token, body: { status } });
  assert.equal((await set(pedA, 'enviado', tA)).status, 409, 'pular de pendente para enviado');
  assert.equal((await set(pedA, 'aceito', tC)).status, 403, 'cliente aceitando');
  assert.equal((await set(pedA, 'aceito', tB)).status, 404, 'lojista de outra loja');
  assert.equal((await set(pedA, 'aceito', tA)).body.status, 'aceito');
  assert.equal((await set(pedA, 'enviado', tA)).body.status, 'enviado');
  assert.equal((await set(pedA, 'cancelado', tA)).status, 409, 'cancelar enviado');
  assert.equal((await set(pedA, 'cancelado', tC)).status, 409);
  assert.equal((await set(pedA, 'concluido', tA)).body.status, 'concluido');
  assert.equal(sql(`select estoque from produtos where id = '${prodA}'`), '8');
});
await step('lojista cancela pedido aceito e o estoque volta', async () => {
  const id = (await order(lojaA, prodA, 3)).body.id;
  assert.equal(sql(`select estoque from produtos where id = '${prodA}'`), '5');
  await api(`/pedidos/${id}/status`, { method: 'PATCH', token: tA, body: { status: 'aceito' } });
  assert.equal((await api(`/pedidos/${id}/status`, { method: 'PATCH', token: tA, body: { status: 'cancelado' } })).body.status, 'cancelado');
  assert.equal(sql(`select estoque from produtos where id = '${prodA}'`), '8');
});
await step('lojista não altera preço/total histórico nem itens (acesso direto)', async () => {
  const r1 = await rest(`/itens_pedido?pedido_id=eq.${pedA}`, { method: 'PATCH', token: tA, body: { preco_unitario: 0.01 } });
  assert.equal(r1.status, 403);
  const r2 = await rest(`/pedidos?id=eq.${pedA}`, { method: 'PATCH', token: tA, body: { total: 1, status: 'pendente' } });
  assert.equal(r2.status, 403);
  const r3 = await rest('/pedidos', { method: 'POST', token: tC, body: { usuario_id: uCliente.id, loja_id: lojaA, total: 0, status: 'concluido' } });
  assert.equal(r3.status, 403);
  assert.equal(sql(`select total::text from pedidos where id = '${pedA}'`), '100.00');
});
await step('produto com pedido não pode ser excluído; sem pedido pode', async () => {
  assert.equal((await api(`/produtos/${prodA}`, { method: 'DELETE', token: tA })).status, 409);
  assert.equal((await api(`/produtos/${novo}`, { method: 'DELETE', token: tA })).status, 204);
});

await step('loja fechada, pedido mínimo e confirmação automática valem na compra', async () => {
  const patch = (body) => api(`/lojas/${lojaA}`, { method: 'PATCH', token: tA, body });
  await patch({ aceita_pedidos: false });
  assert.deepEqual((await order(lojaA, prodA)).body, { erro: 'Esta loja não está recebendo pedidos no momento' });
  await patch({ aceita_pedidos: true, pedido_minimo: 1000 });
  const antes = sql(`select estoque from produtos where id = '${prodA}'`);
  assert.deepEqual((await order(lojaA, prodA)).body, { erro: 'O pedido não atinge o valor mínimo da loja' });
  assert.equal(sql(`select estoque from produtos where id = '${prodA}'`), antes, 'estoque mexeu num pedido recusado');
  await patch({ pedido_minimo: 0, confirmar_automaticamente: true });
  assert.equal((await order(lojaA, prodA)).body.status, 'aceito');
  await patch({ confirmar_automaticamente: false });
  const publico = (await api(`/lojas/${lojaA}`)).body;
  assert.ok(!('confirmar_automaticamente' in publico) && !('notificacoes' in publico), 'config interna exposta na vitrine');
  assert.equal((await api('/minha-loja', { token: tA })).body.confirmar_automaticamente, false);
});

await step('mesma chave de idempotência não duplica o pedido nem o estoque', async () => {
  const chave = randomUUID();
  const antes = Number(sql(`select estoque from produtos where id = '${prodB}'`));
  const headers = { 'Idempotency-Key': chave };
  const [r1, r2] = await Promise.all([order(lojaB, prodB, 1, { headers }), order(lojaB, prodB, 1, { headers })]);
  const r3 = await order(lojaB, prodB, 1, { headers });
  assert.equal(r1.body.id, r2.body.id);
  assert.equal(r1.body.id, r3.body.id);
  assert.equal(Number(sql(`select estoque from produtos where id = '${prodB}'`)), antes - 1);
});
await step('compras simultâneas não vendem além do estoque', async () => {
  const prod = sql(`insert into produtos (loja_id, nome, preco, estoque) values ('${lojaB}', 'Últimas unidades', 10, 3) returning id`);
  const respostas = await Promise.all(Array.from({ length: 8 }, () => order(lojaB, prod, 1)));
  const ok = respostas.filter(r => r.status === 201).length;
  const semEstoque = respostas.filter(r => r.status === 409).length;
  assert.equal(ok, 3);
  assert.equal(semEstoque, 5);
  assert.equal(sql(`select estoque from produtos where id = '${prod}'`), '0');
});

console.log(results.join('\n'));
const falhas = results.filter(r => r.startsWith('FAIL')).length;
console.log(`\n${results.length - falhas} ok, ${falhas} falha(s)`);
process.exit(falhas ? 1 : 0);
