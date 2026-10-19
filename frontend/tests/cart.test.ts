import assert from "node:assert/strict";
import test from "node:test";
import { addToCart, cartStorageKey, changeQuantity, orderBody, readCart, removePurchased, subtotal } from "../src/lib/cart.ts";
import type { Produto } from "../src/types/api.ts";

const shop = "11111111-1111-4111-8111-111111111111";
const otherShop = "22222222-2222-4222-8222-222222222222";
const user = "33333333-3333-4333-8333-333333333333";
const product: Produto = {
  id: "853df2ba-7ea1-4e37-9fa3-6ad21cf22101", loja_id: shop, nome: "Caneca",
  descricao: null, preco: 29.9, estoque: 3, created_at: "2026-10-19T12:00:00Z",
};

test("adicionar novamente soma a quantidade sem duplicar o produto", () => {
  const once = addToCart([], product, "Loja", 1);
  const twice = addToCart(once, product, "Loja", 2);
  assert.equal(twice.length, 1);
  assert.equal(twice[0].quantity, 3);
  assert.equal(once[0].quantity, 1);
});

test("adição cumulativa respeita o estoque atual, inclusive se ele cair", () => {
  const lines = addToCart([], product, "Loja", 2);
  assert.throws(() => addToCart(lines, product, "Loja", 2), /Quantidade indisponível/);
  assert.throws(() => addToCart(lines, { ...product, estoque: 1 }, "Loja"), /Quantidade indisponível/);
  assert.throws(() => addToCart([], { ...product, estoque: 0 }, "Loja"), /Quantidade indisponível/);
});

test("quantidades inválidas e superiores ao limite de 1000 são recusadas", () => {
  const lines = addToCart([], product, "Loja");
  for (const invalid of [0, -1, 1.5, NaN, Infinity, 4]) {
    assert.throws(() => changeQuantity(lines, product.id, invalid));
    assert.throws(() => addToCart([], product, "Loja", invalid));
  }
  assert.throws(() => addToCart([], { ...product, estoque: 2000 }, "Loja", 1001));
});

test("limite de produtos diferentes é aplicado por loja", () => {
  const lines = Array.from({ length: 50 }, (_, i) => ({ product: { ...product, id: String(i) }, storeName: "Loja", quantity: 1 }));
  assert.throws(() => addToCart(lines, product, "Loja"), /50 produtos/);
  assert.equal(addToCart(lines, { ...product, loja_id: otherShop }, "Outra").length, 51);
});

test("valores são somados em centavos, sem erro de arredondamento", () => {
  const a = { product: { ...product, preco: 0.1 }, storeName: "Loja", quantity: 1 };
  const b = { ...a, product: { ...product, preco: 0.2 } };
  assert.equal(subtotal([a, b]), 0.3);
  assert.equal(subtotal(addToCart([], product, "Loja", 3)), 89.7);
});

test("pedido contém só IDs e quantidades da loja selecionada", () => {
  let lines = addToCart([], product, "Loja", 2);
  lines = addToCart(lines, { ...product, id: "853df2ba-7ea1-4e37-9fa3-6ad21cf22102", loja_id: otherShop }, "Outra");
  assert.deepEqual(orderBody(shop, lines), {
    loja_id: shop, itens: [{ produto_id: product.id, quantidade: 2 }],
  });
  assert.throws(() => orderBody("loja-ausente", lines), /Não há produtos/);
});

test("sucesso remove somente as quantidades compradas e preserva as outras lojas", () => {
  const purchased = addToCart([], product, "Loja");
  let lines = addToCart(purchased, product, "Loja");
  lines = addToCart(lines, { ...product, id: "853df2ba-7ea1-4e37-9fa3-6ad21cf22102", loja_id: otherShop }, "Outra");
  const result = removePurchased(lines, purchased);
  assert.equal(result.length, 2);
  assert.equal(result[0].quantity, 1);
  assert.equal(result[1].product.loja_id, otherShop);
  assert.deepEqual(removePurchased(purchased, purchased), []);
});

test("persistência recupera o carrinho e descarta dados inválidos ou duplicados", () => {
  const lines = addToCart([], product, "Loja", 2);
  assert.deepEqual(readCart(JSON.stringify(lines)), lines);
  assert.deepEqual(readCart("{quebrado"), []);
  assert.deepEqual(readCart('{"unexpected":true}'), []);
  assert.deepEqual(readCart(null), []);
  assert.deepEqual(readCart(JSON.stringify([null, ...lines, ...lines])), lines);
  assert.deepEqual(readCart(JSON.stringify([{ ...lines[0], quantity: -1 }])), []);
});

test("cada usuário usa sua própria chave; token inválido não compartilha carrinho", () => {
  const jwt = (sub: string) => `header.${Buffer.from(JSON.stringify({ sub })).toString("base64url")}.signature`;
  assert.notEqual(cartStorageKey(jwt(user)), cartStorageKey(jwt(otherShop)));
  assert.ok(cartStorageKey(jwt(user))?.endsWith(user));
  assert.equal(cartStorageKey("inválido"), null);
  assert.equal(cartStorageKey(null), null);
});
