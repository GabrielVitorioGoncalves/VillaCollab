import { Response } from 'express';

type RpcCode = 'INVALID' | 'FORBIDDEN' | 'NOT_FOUND' | 'CONFLICT' | 'STOCK' | 'INACTIVE' | 'CLOSED' | 'MINIMUM';

const statusMap: Record<RpcCode, number> = {
  INVALID: 400, FORBIDDEN: 403, NOT_FOUND: 404, CONFLICT: 409, STOCK: 409,
  INACTIVE: 409, CLOSED: 409, MINIMUM: 409
};

const defaultMessages: Record<RpcCode, string> = {
  INVALID: 'Pedido inválido',
  FORBIDDEN: 'Sem permissão',
  NOT_FOUND: 'Pedido ou produto não encontrado',
  CONFLICT: 'Operação incompatível com o estado do pedido',
  STOCK: 'Estoque insuficiente',
  INACTIVE: 'Produto indisponível',
  CLOSED: 'Esta loja não está recebendo pedidos no momento',
  MINIMUM: 'O pedido não atinge o valor mínimo da loja'
};

export function rpcFailure(
  error: { message: string; code?: string },
  res: Response,
  messages: Partial<Record<RpcCode, string>> = {}
): boolean {
  const match = /^VC_(INVALID|FORBIDDEN|NOT_FOUND|CONFLICT|STOCK|INACTIVE|CLOSED|MINIMUM)(?:\b|:)/.exec(error.message);
  if (!match) return false;
  const code = match[1] as RpcCode;
  res.status(statusMap[code]).json({ erro: messages[code] ?? defaultMessages[code] });
  return true;
}
