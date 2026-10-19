import assert from "node:assert/strict";
import { after, beforeEach, test } from "node:test";
import { api, ApiError } from "../src/lib/api.ts";

const originalFetch = globalThis.fetch;
let token: string | null;
Object.defineProperty(globalThis, "sessionStorage", { configurable: true, value: { getItem: () => token } });
beforeEach(() => { token = "test-token"; });
after(() => { globalThis.fetch = originalFetch; });

test("pedido envia Bearer e JSON com contrato da API", async () => {
  let captured: RequestInit | undefined;
  const body = { loja_id: "loja", itens: [{ produto_id: "produto", quantidade: 2 }] };
  globalThis.fetch = async (url, init) => {
    assert.equal(String(url), "http://localhost:3333/api/pedidos"); captured = init;
    return Response.json({ id: "pedido" }, { status: 201 });
  };
  assert.deepEqual(await api("/pedidos", { method: "POST", auth: true, body }), { id: "pedido" });
  assert.equal((captured?.headers as Record<string, string>).Authorization, "Bearer test-token");
  assert.equal(captured?.body, JSON.stringify(body));
});

test("requisição autenticada sem sessão falha antes de chamar a rede", async () => {
  token = null;
  globalThis.fetch = async () => { throw new Error("não deveria chamar"); };
  await assert.rejects(api("/pedidos", { auth: true }), (error: unknown) => error instanceof ApiError && error.status === 401);
});

test("erro de estoque é mantido para apresentação ao usuário", async () => {
  globalThis.fetch = async () => Response.json({ erro: "Estoque insuficiente" }, { status: 409 });
  await assert.rejects(api("/pedidos", { method: "POST", auth: true }),
    (error: unknown) => error instanceof ApiError && error.status === 409 && error.message === "Estoque insuficiente");
});

test("sessão expirada retorna uma mensagem de autenticação", async () => {
  globalThis.fetch = async () => Response.json({ erro: "Token inválido" }, { status: 401 });
  await assert.rejects(api("/pedidos/meus", { auth: true }), /Sua sessão expirou/);
});

test("erro de rede em POST não é repetido automaticamente", async () => {
  let calls = 0;
  globalThis.fetch = async () => { calls++; throw new TypeError("fetch failed"); };
  await assert.rejects(api("/pedidos", { method: "POST", auth: true }),
    (error: unknown) => error instanceof ApiError && error.status === 0);
  assert.equal(calls, 1);
});

test("página HTML de inicialização da API é tratada sem erro cru de JSON", async () => {
  globalThis.fetch = async () => new Response("<html>Loading</html>");
  await assert.rejects(api("/lojas"), /O serviço não respondeu corretamente/);
});

test("conexão interrompida durante a resposta mantém o resultado como não confirmado", async () => {
  globalThis.fetch = async () => new Response(new ReadableStream({
    start(controller) { controller.error(new TypeError("connection reset")); },
  }));
  await assert.rejects(api("/pedidos", { method: "POST", auth: true }),
    (error: unknown) => error instanceof ApiError && error.status === 0);
});
