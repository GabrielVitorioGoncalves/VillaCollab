// Formatos devolvidos pelo backend (backend/src/controllers).
// Campos marcados como opcionais (?) vêm da migração catalogo_perfil_pedidos.sql:
// o front funciona mesmo se ela ainda não tiver sido aplicada.

export type UserRole = "cliente" | "lojista" | "admin";

export interface Opcao {
  id: string;
  nome: string;
}

export interface FiltroLoja {
  id: string;
  nome: string;
  tipo: "checkbox" | "radio";
  opcoes: Opcao[];
}

export interface Variacao {
  id: string;
  nome: string;
  opcoes: Opcao[];
}

export interface Atributo {
  nome: string;
  valor: string;
}

export interface Endereco {
  nome?: string;
  cep: string;
  rua: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  estado: string;
}

export interface Usuario {
  id: string;
  nome: string;
  role: UserRole;
  loja_id: string | null;
  email?: string | null;
  telefone?: string | null;
  endereco?: Endereco | null;
}

export interface Loja {
  id: string;
  nome: string;
  slug: string;
  descricao: string | null;
  created_at: string;
  categoria?: string | null;
  logo_url?: string | null;
  banner_url?: string | null;
  filtros?: FiltroLoja[];
  nota_media?: number | string | null;
  total_avaliacoes?: number;
  total_produtos?: number;
}

export interface Produto {
  id: string;
  loja_id: string;
  nome: string;
  descricao: string | null;
  // DECIMAL do Postgres: tratar com Number() por segurança.
  preco: number | string;
  estoque: number;
  created_at: string;
  categoria?: string | null;
  preco_antigo?: number | string | null;
  imagens?: string[];
  atributos?: Atributo[];
  variacoes?: Variacao[];
  filtros?: Record<string, string[]>;
  nota_media?: number | string | null;
  total_avaliacoes?: number;
}

export type PedidoStatus = "pendente" | "aceito" | "concluido" | "cancelado";
export type FormaPagamento = "pix" | "cartao";

export interface ItemPedido {
  id: string;
  produto_id: string;
  quantidade: number;
  preco_unitario: number | string;
  subtotal: number | string;
  variacoes?: Record<string, string>;
}

export interface Pedido {
  id: string;
  usuario_id: string;
  loja_id: string;
  status: PedidoStatus;
  total: number | string;
  created_at: string;
  updated_at: string;
  endereco_entrega?: Endereco | null;
  forma_pagamento?: FormaPagamento | null;
  parcelas?: number | null;
  itens_pedido: ItemPedido[];
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  usuario: Usuario;
}

export interface RegisterResponse {
  id: string;
  confirmacao_email_pendente: boolean;
}

// GET/PUT /api/carrinho: item com os dados do produto e o nome da loja.
export interface CarrinhoItem {
  produto_id: string;
  quantidade: number;
  variacoes: Record<string, string>;
  produtos:
    | (Pick<Produto, "id" | "loja_id" | "nome" | "preco" | "estoque" | "imagens" | "variacoes"> & {
        lojas: { nome: string } | null;
      })
    | null;
}
