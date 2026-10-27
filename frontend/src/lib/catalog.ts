// Converte os dados da API para os formatos que os componentes já usavam.
import type { Store } from "../components/marketplace/storeCard";
import type { StoreFilter } from "../components/marketplace/storeFilterSideBar";
import type { ProductVariant } from "../components/marketplace/productVariants";
import type { ProductAttribute } from "../components/marketplace/productAtrributes";
import type { Loja, Produto, Variacao } from "../types/api";
import { toNumber } from "./format";

export function toStoreCard(loja: Loja): Store {
  return {
    id: loja.id,
    name: loja.nome,
    description: loja.descricao ?? undefined,
    category: loja.categoria ?? undefined,
    logo: loja.logo_url ?? undefined,
    banner: loja.banner_url ?? undefined,
    productCount: loja.total_produtos,
  };
}

// Nota só aparece quando existe pelo menos uma avaliação.
export function ratingOf(item: { nota_media?: number | string | null; total_avaliacoes?: number }) {
  if (!item.total_avaliacoes || item.nota_media === null || item.nota_media === undefined) {
    return undefined;
  }
  return { rating: toNumber(item.nota_media), reviewCount: item.total_avaliacoes };
}

// Promoção: preço "de" maior que o preço atual.
export function promotionOf(produto: Produto) {
  const price = toNumber(produto.preco);
  const oldPrice = toNumber(produto.preco_antigo);
  if (!oldPrice || oldPrice <= price) return { oldPrice: undefined, discount: undefined };
  return { oldPrice, discount: Math.round((1 - price / oldPrice) * 100) };
}

export function toStoreFilters(loja: Loja): StoreFilter[] {
  return (loja.filtros ?? []).map((filtro) => ({
    id: filtro.id,
    name: filtro.nome,
    type: filtro.tipo,
    options: filtro.opcoes.map((opcao) => ({ id: opcao.id, label: opcao.nome })),
  }));
}

export function toProductVariants(variacoes: Variacao[] = []): ProductVariant[] {
  return variacoes.map((variacao) => ({
    id: variacao.id,
    name: variacao.nome,
    options: variacao.opcoes.map((opcao) => ({ id: opcao.id, label: opcao.nome })),
  }));
}

export function toProductAttributes(produto: Produto): ProductAttribute[] {
  return (produto.atributos ?? []).map((atributo, index) => ({
    id: `${index}-${atributo.nome}`,
    name: atributo.nome,
    value: atributo.valor,
  }));
}

// "Tamanho: M · Cor: Preto", na ordem em que a loja cadastrou as variações.
export function variantLabel(variacoes: Variacao[] = [], selected: Record<string, string> = {}): string {
  return variacoes
    .filter((variacao) => selected[variacao.id])
    .map((variacao) => {
      const opcao = variacao.opcoes.find((item) => item.id === selected[variacao.id]);
      return `${variacao.nome}: ${opcao?.nome ?? selected[variacao.id]}`;
    })
    .join(" · ");
}
