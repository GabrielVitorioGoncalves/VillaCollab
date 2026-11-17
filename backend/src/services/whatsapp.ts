type Variacao = { id: string; nome?: string; opcoes?: { id: string; nome?: string }[] };

type ItemPedido = {
  produto_id: string;
  quantidade: number;
  subtotal: number | string;
  variacoes?: Record<string, string> | null;
};

type Endereco = {
  nome?: string;
  cep?: string;
  rua?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
};

export type PedidoParaWhatsapp = {
  id: string;
  total: number | string | null;
  endereco_entrega?: Endereco | null;
  itens_pedido: ItemPedido[];
};

export type ProdutoParaWhatsapp = { id: string; nome: string; variacoes?: Variacao[] | null };

const MAX_ITENS_NA_MENSAGEM = 30;

const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

function reais(valor: number | string | null | undefined): string {
  return moeda.format(Number(valor ?? 0)).replace(/\s/g, ' ');
}

function limpo(texto: string | null | undefined, limite = 120): string {
  return (texto ?? '').replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, limite);
}

export function telefoneWhatsappValido(telefone: string | null | undefined): boolean {
  if (!telefone || telefone.length > 20 || !/^\+?[0-9()\-\s]+$/.test(telefone)) return false;
  const digitos = telefone.replace(/\D/g, '');
  if (!telefone.includes('+') && /^[1-9][0-9]{9,10}$/.test(digitos)) return true;
  return /^55[1-9][0-9]{9,10}$/.test(digitos);
}

export function numeroWhatsapp(telefone: string | null | undefined): string | null {
  if (!telefone || !telefoneWhatsappValido(telefone)) return null;
  const digitos = telefone.replace(/\D/g, '');
  return digitos.length <= 11 ? `55${digitos}` : digitos;
}

function nomesDasVariacoes(escolhas: Record<string, string> | null | undefined, produto?: ProdutoParaWhatsapp): string {
  const partes = Object.entries(escolhas ?? {}).map(([variacaoId, opcaoId]) => {
    const variacao = produto?.variacoes?.find(item => item.id === variacaoId);
    const opcao = variacao?.opcoes?.find(item => item.id === opcaoId);
    return `${limpo(variacao?.nome ?? variacaoId, 40)}: ${limpo(opcao?.nome ?? opcaoId, 40)}`;
  });
  return partes.length > 0 ? ` (${partes.join(', ')})` : '';
}

function linhaDoEndereco(endereco: Endereco): string {
  const rua = [limpo(endereco.rua), limpo(endereco.numero, 20)].filter(Boolean).join(', ');
  const cidade = [limpo(endereco.cidade, 60), limpo(endereco.estado, 2)].filter(Boolean).join('/');
  return [
    [rua, limpo(endereco.complemento)].filter(Boolean).join(', '),
    limpo(endereco.bairro, 60),
    cidade,
    endereco.cep ? `CEP ${limpo(endereco.cep, 9)}` : ''
  ].filter(Boolean).join(' - ');
}

export function mensagemDoPedido(pedido: PedidoParaWhatsapp, nomeLoja: string, produtos: ProdutoParaWhatsapp[]): string {
  const porId = new Map(produtos.map(produto => [produto.id, produto]));
  const itens = pedido.itens_pedido.slice(0, MAX_ITENS_NA_MENSAGEM).map(item => {
    const produto = porId.get(item.produto_id);
    const nome = limpo(produto?.nome) || 'Produto';
    return `• ${item.quantidade}x ${nome}${nomesDasVariacoes(item.variacoes, produto)} - ${reais(item.subtotal)}`;
  });
  const restantes = pedido.itens_pedido.length - MAX_ITENS_NA_MENSAGEM;
  if (restantes > 0) itens.push(`• e mais ${restantes} ${restantes === 1 ? 'item' : 'itens'}`);

  const linhas = [
    `Olá! Fiz o pedido ${pedido.id.slice(0, 8).toUpperCase()} na ${limpo(nomeLoja) || 'loja'} pelo Villa Collab e quero combinar o pagamento.`,
    '',
    'Itens:',
    ...itens,
    `Total: ${reais(pedido.total)}`
  ];
  if (pedido.endereco_entrega) {
    linhas.push('', `Entrega para ${limpo(pedido.endereco_entrega.nome) || 'mim'}:`, linhaDoEndereco(pedido.endereco_entrega));
  }
  return linhas.join('\n');
}

export function linkWhatsapp(numero: string, texto: string): string {
  return `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`;
}
