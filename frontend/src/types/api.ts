export interface Loja {
  id: string;
  nome: string;
  slug: string;
  descricao: string | null;
  created_at: string;
}

export interface Produto {
  id: string;
  loja_id: string;
  nome: string;
  descricao: string | null;
  preco: number;
  estoque: number;
  created_at: string;
}

export interface ItemPedido {
  id: string;
  produto_id: string;
  quantidade: number;
  preco_unitario: number;
  subtotal: number;
}

export interface Pedido {
  id: string;
  usuario_id: string;
  loja_id: string;
  status: "pendente" | "aceito" | "concluido" | "cancelado";
  total: number;
  created_at: string;
  updated_at: string;
  itens_pedido: ItemPedido[];
}
