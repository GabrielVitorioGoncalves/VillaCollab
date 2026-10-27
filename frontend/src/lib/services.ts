import { apiRequest } from "./api";
import type {
  CarrinhoItem,
  Endereco,
  FormaPagamento,
  LoginResponse,
  Loja,
  Pedido,
  Produto,
  RegisterResponse,
  Usuario,
} from "../types/api";

/* Autenticação */

export function login(email: string, password: string) {
  return apiRequest<LoginResponse>("/auth/login", { method: "POST", body: { email, password } });
}

export function register(nome: string, email: string, password: string) {
  return apiRequest<RegisterResponse>("/auth/register", {
    method: "POST",
    body: { nome, email, password },
  });
}

export function getMe() {
  return apiRequest<Usuario>("/auth/me", { auth: true });
}

export interface ProfileUpdate {
  nome?: string;
  telefone?: string | null;
  endereco?: Endereco | null;
}

export function updateMe(data: ProfileUpdate) {
  return apiRequest<Usuario>("/auth/me", { method: "PATCH", auth: true, body: data });
}

// O e-mail só muda depois que o usuário confirma pelo link enviado pelo Supabase.
export function changeEmail(email: string) {
  return apiRequest<{ confirmacao_email_pendente: boolean }>("/auth/email", {
    method: "PATCH",
    auth: true,
    body: { email },
  });
}

export function changePassword(senhaAtual: string, novaSenha: string) {
  return apiRequest<void>("/auth/senha", {
    method: "PATCH",
    auth: true,
    body: { senha_atual: senhaAtual, nova_senha: novaSenha },
  });
}

/* Lojas e produtos (rotas públicas) */

export function listStores() {
  return apiRequest<Loja[]>("/lojas");
}

export function getStore(id: string) {
  return apiRequest<Loja>(`/lojas/${encodeURIComponent(id)}`);
}

export function listStoreProducts(storeId: string) {
  return apiRequest<Produto[]>(`/produtos/loja/${encodeURIComponent(storeId)}`);
}

export function getProduct(id: string) {
  return apiRequest<Produto>(`/produtos/${encodeURIComponent(id)}`);
}

/* Pedidos */

export interface NewOrderItem {
  produto_id: string;
  quantidade: number;
  variacoes?: Record<string, string>;
}

export interface NewOrderOptions {
  endereco_entrega?: Endereco;
  forma_pagamento?: FormaPagamento;
  parcelas?: number;
}

export function createOrder(lojaId: string, itens: NewOrderItem[], options: NewOrderOptions = {}) {
  return apiRequest<Pedido>("/pedidos", {
    method: "POST",
    auth: true,
    body: { loja_id: lojaId, itens, ...options },
  });
}

export function rateProduct(productId: string, nota: number, comentario?: string) {
  return apiRequest<{ id: string; nota_media: number | string | null; total_avaliacoes: number }>(
    `/produtos/${encodeURIComponent(productId)}/avaliacoes`,
    { method: "POST", auth: true, body: comentario ? { nota, comentario } : { nota } }
  );
}

export function listMyOrders() {
  return apiRequest<Pedido[]>("/pedidos/meus", { auth: true });
}

export function getOrder(id: string) {
  return apiRequest<Pedido>(`/pedidos/${encodeURIComponent(id)}`, { auth: true });
}

export function cancelOrder(id: string) {
  return apiRequest<Pedido>(`/pedidos/${encodeURIComponent(id)}/status`, {
    method: "PATCH",
    auth: true,
    body: { status: "cancelado" },
  });
}

/* Carrinho da conta (o de visitante fica só no navegador) */

export interface CartItemInput {
  produto_id: string;
  quantidade: number;
  variacoes?: Record<string, string>;
}

export function getCart() {
  return apiRequest<CarrinhoItem[]>("/carrinho", { auth: true });
}

export function saveCart(itens: CartItemInput[]) {
  return apiRequest<CarrinhoItem[]>("/carrinho", { method: "PUT", auth: true, body: { itens } });
}
