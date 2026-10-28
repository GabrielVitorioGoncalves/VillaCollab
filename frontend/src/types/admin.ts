import type { PedidoStatus, UserRole } from "./api";

export type AdminStoreStatus = "ativo" | "inativo";

export interface AdminStore {
  id: string;
  nome: string;
  slug: string;
  categoria: string | null;
  cnpj: string | null;
  telefone: string | null;
  email_contato: string | null;
  logo_url: string | null;
  ativa: boolean;
  aceita_pedidos: boolean;
  created_at: string;
  responsavel_id: string | null;
  responsavel_nome: string | null;
  responsavel_email: string | null;
  total_produtos: number;
  total_pedidos: number;
}

export type PapelUsuario = "Cliente final" | "Dono de loja" | "Administrador";

export type TipoAdministrador = "Admin" | "Gerente" | "Suporte";

export type PermissaoAdmin = "lojas" | "produtos" | "usuarios" | "relatorios";

export interface AdminUser {
  id: string;
  nome: string;
  email: string | null;
  role: UserRole;
  loja_id: string | null;
  loja_nome: string | null;
  admin_tipo: TipoAdministrador | null;
  admin_permissoes: PermissaoAdmin[] | null;
  mfa: boolean;
  ultimo_login: string | null;
  criado_em: string;
  total_pedidos: number;
  voce: boolean;
}

export interface AdminMe {
  id: string;
  nome: string;
  email: string | null;
  admin_tipo: TipoAdministrador;
  permissoes: PermissaoAdmin[];
}

export interface AdminDashboard {
  volume_bruto: number;
  pedidos_mes: number;
  lojas_ativas: number;
  lojas_total: number;
  ultimos_dias: { data: string; receita: number; pedidos: number }[];
  ranking_lojas: { id: string; nome: string; ativa: boolean; pedidos: number; faturamento: number }[];
  pedidos_recentes: {
    id: string;
    loja: string;
    cliente: string | null;
    valor: number;
    status: PedidoStatus;
    created_at: string;
  }[];
  alertas: {
    lojas_sem_responsavel: number;
    lojas_desativadas: number;
    lojas_sem_receber_pedidos: number;
    pedidos_pendentes_atrasados: number;
  };
}

export interface AdminStoreInput {
  nome: string;
  email: string;
  senha: string;
  cnpj: string;
  telefone: string;
  categoria: string;
}

export interface AdminStoreUpdate {
  nome?: string;
  email?: string;
  cnpj?: string;
  telefone?: string;
  categoria?: string;
  ativa?: boolean;
  logo_url?: string | null;
}

export type AdminRoleInput =
  | { role: "cliente" }
  | { role: "lojista"; loja_id: string }
  | { role: "admin"; admin_tipo: TipoAdministrador; admin_permissoes?: PermissaoAdmin[] };

export interface AdminAccountInput {
  nome: string;
  email: string;
  senha: string;
  admin_tipo: TipoAdministrador;
  admin_permissoes?: PermissaoAdmin[];
}
