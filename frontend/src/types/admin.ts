export type AdminStoreStatus = "ativo" | "inativo";

export interface AdminStore {
  id: string;
  tenant: string;
  nome: string;
  responsavel: string;
  categoria: string;
  cnpj: string;
  telefone: string;
  status: AdminStoreStatus;
}

export type PapelUsuario = "Cliente final" | "Dono de loja" | "Administrador";

export interface AdminUser {
  id: string;
  nome: string;
  email: string;
  papel: PapelUsuario;
  mfa: boolean;
  ultimoLogin: string;
}

export type TipoAdministrador = "Admin" | "Gerente" | "Suporte";

export type PermissaoAdmin = "lojas" | "produtos" | "usuarios" | "relatorios";

export interface AdminDashboard {
  volumeBruto: number;
  pedidosMes: number;
  lojasAtivas: number;
  receitasUltimos7Dias: { dia: string; receita: number; pedidos: number }[];
  topLojas: { id: string; nome: string; pedidos: number; faturamento: number }[];
  transacoesRecentes: {
    id: string;
    loja: string;
    cliente: string;
    valor: number;
    status: "Pago" | "Pendente" | "Estornado";
  }[];
  alertas: string[];
}
