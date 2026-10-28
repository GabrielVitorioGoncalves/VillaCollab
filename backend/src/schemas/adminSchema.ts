import { z } from 'zod';
import { urlImagemSchema } from './catalogoSchema';

export const PERMISSOES_ADMIN = ['lojas', 'produtos', 'usuarios', 'relatorios'] as const;
export type PermissaoAdmin = typeof PERMISSOES_ADMIN[number];

export const CATEGORIAS_LOJA = [
  'Moda e acessórios',
  'Casa e decoração',
  'Eletrônicos',
  'Beleza e cuidados pessoais',
  'Esportes',
  'Alimentos e bebidas',
  'Outros'
] as const;

export function normalizarCnpj(valor: string): string {
  return valor.toUpperCase().replace(/[^0-9A-Z]/g, '');
}

function digitoCnpj(base: string): number {
  let peso = 2;
  let soma = 0;
  for (let i = base.length - 1; i >= 0; i--) {
    soma += (base.charCodeAt(i) - 48) * peso;
    peso = peso === 9 ? 2 : peso + 1;
  }
  const resto = soma % 11;
  return resto < 2 ? 0 : 11 - resto;
}

export function cnpjValido(valor: string): boolean {
  const cnpj = normalizarCnpj(valor);
  if (!/^[0-9A-Z]{12}[0-9]{2}$/.test(cnpj) || /^(\d)\1{13}$/.test(cnpj)) return false;
  const primeiro = digitoCnpj(cnpj.slice(0, 12));
  const segundo = digitoCnpj(cnpj.slice(0, 12) + primeiro);
  return cnpj.endsWith(`${primeiro}${segundo}`);
}

const cnpjSchema = z.string().trim().refine(cnpjValido, 'CNPJ inválido').transform(normalizarCnpj);

const telefoneSchema = z.string().trim().max(20)
  .regex(/^[0-9()+\-\s]+$/, 'Telefone inválido')
  .refine(valor => {
    const digitos = valor.replace(/\D/g, '').length;
    return digitos >= 10 && digitos <= 11;
  }, 'Informe um telefone com DDD');

const emailSchema = z.string().trim().toLowerCase().pipe(z.email('E-mail inválido').max(255));
const senhaSchema = z.string().min(8, 'A senha deve ter pelo menos 8 caracteres').max(72);
const nomeLojaSchema = z.string().trim().min(2, 'Informe o nome da loja').max(255);

export const criarLojaSchema = z.object({
  nome: nomeLojaSchema,
  email: emailSchema,
  senha: senhaSchema,
  cnpj: cnpjSchema,
  telefone: telefoneSchema,
  categoria: z.enum(CATEGORIAS_LOJA)
}).strict();

export const atualizarLojaSchema = z.object({
  nome: nomeLojaSchema.optional(),
  email: emailSchema.optional(),
  cnpj: cnpjSchema.optional(),
  telefone: telefoneSchema.optional(),
  categoria: z.enum(CATEGORIAS_LOJA).optional(),
  ativa: z.boolean().optional(),
  logo_url: urlImagemSchema.nullable().optional(),
  banner_url: urlImagemSchema.nullable().optional()
}).strict().refine(dados => Object.keys(dados).length > 0, 'Informe pelo menos um campo');

const tipoAdminSchema = z.enum(['Admin', 'Gerente', 'Suporte']);
const permissoesSchema = z.array(z.enum(PERMISSOES_ADMIN)).min(1, 'Escolha pelo menos uma permissão').max(4);

export const papelSchema = z.discriminatedUnion('role', [
  z.object({ role: z.literal('cliente') }).strict(),
  z.object({ role: z.literal('lojista'), loja_id: z.uuid('Escolha a loja') }).strict(),
  z.object({
    role: z.literal('admin'),
    admin_tipo: tipoAdminSchema,
    admin_permissoes: permissoesSchema.optional()
  }).strict()
]);

export const criarAdminSchema = z.object({
  nome: z.string().trim().min(2, 'Informe o nome completo').max(255),
  email: emailSchema,
  senha: senhaSchema,
  admin_tipo: tipoAdminSchema,
  admin_permissoes: permissoesSchema.optional()
}).strict();

export function permissoesDoTipo(tipo: 'Admin' | 'Gerente' | 'Suporte', permissoes?: PermissaoAdmin[]): PermissaoAdmin[] | null {
  if (tipo === 'Admin') return [...PERMISSOES_ADMIN];
  return permissoes && permissoes.length > 0 ? [...new Set(permissoes)] : null;
}
