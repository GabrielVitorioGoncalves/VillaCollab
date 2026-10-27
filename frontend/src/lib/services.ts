import { apiRequest } from "./api";
import type {
  Atributo,
  CarrinhoItem,
  Endereco,
  FiltroLoja,
  MinhaLoja,
  NotificacoesLoja,
  PedidoLoja,
  PedidoStatus,
  Variacao,
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

export function createOrder(
  lojaId: string,
  itens: NewOrderItem[],
  options: NewOrderOptions = {},
  idempotencyKey?: string
) {
  return apiRequest<Pedido>("/pedidos", {
    method: "POST",
    auth: true,
    body: { loja_id: lojaId, itens, ...options },
    headers: idempotencyKey ? { "Idempotency-Key": idempotencyKey } : undefined,
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

export function getMyStore() {
  return apiRequest<MinhaLoja>("/minha-loja", { auth: true });
}

export function listMyProducts() {
  return apiRequest<Produto[]>("/minha-loja/produtos", { auth: true });
}

export function getMyProduct(id: string) {
  return apiRequest<Produto>(`/minha-loja/produtos/${encodeURIComponent(id)}`, { auth: true });
}

export function listStoreOrders() {
  return apiRequest<PedidoLoja[]>("/minha-loja/pedidos", { auth: true });
}

export function getStoreOrder(id: string) {
  return apiRequest<PedidoLoja>(`/minha-loja/pedidos/${encodeURIComponent(id)}`, { auth: true });
}

export function updateOrderStatus(id: string, status: Exclude<PedidoStatus, "pendente">) {
  return apiRequest<Pedido>(`/pedidos/${encodeURIComponent(id)}/status`, {
    method: "PATCH",
    auth: true,
    body: { status },
  });
}

export interface ProductInput {
  nome?: string;
  descricao?: string;
  preco?: number;
  preco_antigo?: number | null;
  categoria?: string;
  imagens?: string[];
  atributos?: Atributo[];
  variacoes?: Variacao[];
  filtros?: Record<string, string[]>;
  ativo?: boolean;
}

export function createProduct(lojaId: string, data: ProductInput & { nome: string; preco: number }) {
  return apiRequest<Produto>("/produtos", { method: "POST", auth: true, body: { loja_id: lojaId, ...data } });
}

export function updateProduct(id: string, data: ProductInput) {
  return apiRequest<Produto>(`/produtos/${encodeURIComponent(id)}`, { method: "PATCH", auth: true, body: data });
}

export function updateStock(id: string, estoque: number) {
  return apiRequest<Produto>(`/produtos/${encodeURIComponent(id)}/estoque`, {
    method: "PATCH",
    auth: true,
    body: { estoque },
  });
}

export function deleteProduct(id: string) {
  return apiRequest<void>(`/produtos/${encodeURIComponent(id)}`, { method: "DELETE", auth: true });
}

export interface StoreInput {
  nome?: string;
  descricao?: string | null;
  categoria?: string | null;
  logo_url?: string | null;
  banner_url?: string | null;
  filtros?: FiltroLoja[];
  email_contato?: string | null;
  telefone?: string | null;
  aceita_pedidos?: boolean;
  exibir_estoque?: boolean;
  confirmar_automaticamente?: boolean;
  prazo_preparo_dias?: number | null;
  pedido_minimo?: number;
  notificacoes?: NotificacoesLoja;
}

export function updateStore(id: string, data: StoreInput) {
  return apiRequest<MinhaLoja>(`/lojas/${encodeURIComponent(id)}`, { method: "PATCH", auth: true, body: data });
}

export function uploadImage(file: File, tipo: "produto" | "logo" | "banner") {
  return apiRequest<{ url: string }>(`/minha-loja/imagens?tipo=${tipo}`, { method: "POST", auth: true, file });
}
