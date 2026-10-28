import type { AdminDashboard, AdminStore, AdminUser } from "../../types/admin";

/*
Dados fictícios usados enquanto o back-end do Admin não existe.
Cada coleção aqui corresponde a um endpoint futuro (ver adminService.ts).
*/

export const mockAdminDashboard: AdminDashboard = {
  volumeBruto: 128450.9,
  pedidosMes: 1284,
  lojasAtivas: 37,
  receitasUltimos7Dias: [
    { dia: "SEG", receita: 14200, pedidos: 162 },
    { dia: "TER", receita: 17850, pedidos: 201 },
    { dia: "QUA", receita: 12900, pedidos: 148 },
    { dia: "QUI", receita: 19640, pedidos: 224 },
    { dia: "SEX", receita: 23110, pedidos: 259 },
    { dia: "SAB", receita: 21480, pedidos: 240 },
    { dia: "DOM", receita: 16270, pedidos: 187 },
  ],
  topLojas: [
    { id: "loja-001", nome: "Urban Store", pedidos: 1200, faturamento: 48300 },
    { id: "loja-004", nome: "Brasa Cafés", pedidos: 960, faturamento: 31750 },
    { id: "loja-003", nome: "TechBox", pedidos: 780, faturamento: 27900 },
  ],
  transacoesRecentes: [
    { id: "PED-1041", loja: "Urban Store", cliente: "testes@testes.com.br", valor: 189.9, status: "Pago" },
    { id: "PED-1040", loja: "Casa Verde", cliente: "maria@exemplo.com", valor: 74.5, status: "Pago" },
    { id: "PED-1039", loja: "TechBox", cliente: "joao@exemplo.com", valor: 1299, status: "Pendente" },
    { id: "PED-1038", loja: "Brasa Cafés", cliente: "ana@exemplo.com", valor: 42, status: "Estornado" },
  ],
  alertas: [
    "2 novas lojas aguardando aprovação de cadastro.",
    "Backup diário realizado com sucesso.",
  ],
};

export const mockAdminStores: AdminStore[] = [
  {
    id: "loja-001",
    tenant: "tn_001",
    nome: "Urban Store",
    responsavel: "urban@exemplo.com",
    categoria: "Moda e acessórios",
    cnpj: "12.345.678/0001-90",
    telefone: "(11) 99999-1111",
    status: "ativo",
  },
  {
    id: "loja-002",
    tenant: "tn_002",
    nome: "Casa Verde",
    responsavel: "casaverde@exemplo.com",
    categoria: "Casa e decoração",
    cnpj: "23.456.789/0001-01",
    telefone: "(47) 98888-2222",
    status: "ativo",
  },
  {
    id: "loja-003",
    tenant: "tn_003",
    nome: "TechBox",
    responsavel: "techbox@exemplo.com",
    categoria: "Eletrônicos",
    cnpj: "34.567.890/0001-12",
    telefone: "(48) 97777-3333",
    status: "ativo",
  },
  {
    id: "loja-004",
    tenant: "tn_004",
    nome: "Brasa Cafés",
    responsavel: "brasa@exemplo.com",
    categoria: "Alimentos e bebidas",
    cnpj: "45.678.901/0001-23",
    telefone: "(48) 96666-4444",
    status: "inativo",
  },
];

export const mockAdminUsers: AdminUser[] = [
  {
    id: "usr-001",
    nome: "Maria Oliveira",
    email: "maria@exemplo.com",
    papel: "Cliente final",
    mfa: true,
    ultimoLogin: "2026-10-28T14:30:00-03:00",
  },
  {
    id: "usr-002",
    nome: "Carlos Mendes",
    email: "carlos@exemplo.com",
    papel: "Dono de loja",
    mfa: true,
    ultimoLogin: "2026-10-27T09:15:00-03:00",
  },
  {
    id: "usr-003",
    nome: "Juliana Ramos",
    email: "juliana@admin.com",
    papel: "Administrador",
    mfa: false,
    ultimoLogin: "2026-10-25T18:02:00-03:00",
  },
];
