import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { AddToCartButton } from "../../components/marketplace/addCartButton";

import { ProductAttributes } from "../../components/marketplace/productAtrributes";
import { ProductVariants } from "../../components/marketplace/productVariants";

import { ProductGallery } from "../../components/marketplace/productGallery";
import { QuantitySelector } from "../../components/marketplace/quantitySelector";
import { Button } from "../../components/ui/button";
import { RequestStatus } from "../../components/ui/requestStatus";
import { quantityInCart, useCart } from "../../contexts/cartContext";
import { useRequest } from "../../hooks/useRequest";
import {
  promotionOf,
  ratingOf,
  toProductAttributes,
  toProductVariants,
} from "../../lib/catalog";
import { isUuid, toNumber } from "../../lib/format";
import { getProduct, getStore } from "../../lib/services";

async function loadProduct(id: string) {
  if (!isUuid(id)) throw new Error("Produto não encontrado.");
  const produto = await getProduct(id);
  const loja = await getStore(produto.loja_id);
  return { produto, loja };
}

export function ProductDetail() {
  const { id = "" } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { lines, addItem } = useCart();

  const { data, loading, error, reload } = useRequest(`produto:${id}`, () => loadProduct(id));

  const [quantity, setQuantity] = useState(1);
  const [missingVariant, setMissingVariant] = useState(false);

  const [selectedVariants, setSelectedVariants] = useState<
    Record<string, string>
  >({});

  const handleVariantChange = (
    variantId: string,
    optionId: string
  ) => {
    setMissingVariant(false);
    setSelectedVariants((current) => ({
      ...current,
      [variantId]: optionId,
    }));
  };

  if (loading || error || !data) {
    return (
      <main className="min-h-screen bg-background">
        <div className="mx-auto w-full max-w-[1240px] px-5 py-8">
          <RequestStatus
            loading={loading}
            error={error ?? "Produto não encontrado."}
            onRetry={isUuid(id) ? reload : undefined}
            loadingText="Carregando produto..."
          />
        </div>
      </main>
    );
  }

  const { produto, loja } = data;

  const product = {
    id: produto.id,
    name: produto.nome,
    images: produto.imagens ?? [],
    price: toNumber(produto.preco),
    oldPrice: promotionOf(produto).oldPrice,
    storeName: loja.nome,
    available: produto.estoque > 0 && produto.ativo !== false && loja.aceita_pedidos !== false && loja.ativa !== false,
    description: produto.descricao ?? undefined,
    rating: ratingOf(produto)?.rating,
    reviewCount: ratingOf(produto)?.reviewCount,
    attributes: toProductAttributes(produto),
    variants: toProductVariants(produto.variacoes),
    stock: produto.estoque,
  };

  const inCart = quantityInCart(lines, produto.id);
  const remaining = Math.max(0, product.stock - inCart);
  const selectedQuantity = Math.min(quantity, Math.max(remaining, 1));
  const pendingVariants = product.variants.filter(
    (variant) => !selectedVariants[variant.id]
  );

  const handleAddToCart = () => {
    if (pendingVariants.length > 0) {
      setMissingVariant(true);
      return;
    }
    const added = addItem(produto, loja.nome, selectedQuantity, selectedVariants);
    if (added > 0) setQuantity(1);
  };

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-[1240px] px-5 py-8">
        {/* Produto */}
        <section className="grid gap-10 lg:grid-cols-2">
          {/* Imagem */}
        <div>
        <ProductGallery
            images={product.images}
            alt={product.name}
        />
        </div>

          {/* Informações */}
          <div className="space-y-7">
            {/* Nome e preço */}
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => navigate(`/user/paginaLoja/${loja.id}`)}
                className="text-sm font-medium text-text-secondary transition-colors hover:text-text"
              >
                {product.storeName}
              </button>

              <h1 className="text-3xl font-bold text-text">
                {product.name}
              </h1>

              <div className="space-y-1">
                {product.oldPrice !== undefined && (
                  <p className="text-base text-text-secondary line-through">
                    {product.oldPrice.toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </p>
                )}

                <p className="text-3xl font-semibold text-text">
                  {product.price.toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
                </p>
              </div>
            </div>

            {/* Avaliação */}
            {product.rating !== undefined && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-text">
                  ★ {product.rating.toFixed(1)}
                </span>

                {product.reviewCount !== undefined && (
                  <span className="text-sm text-text-secondary">
                    ({product.reviewCount}{" "}
                    {product.reviewCount === 1 ? "avaliação" : "avaliações"})
                  </span>
                )}
              </div>
            )}

            {/* Descrição */}
            {product.description && (
              <div className="border-t border-border pt-6">
                <h2 className="mb-3 text-lg font-semibold text-text">
                  Descrição
                </h2>

                <p className="whitespace-pre-line text-sm leading-6 text-text-secondary">
                  {product.description}
                </p>
              </div>
            )}

            {/* Variações */}
            <ProductVariants
              variants={product.variants}
              selectedValues={selectedVariants}
              onChange={handleVariantChange}
            />

            {missingVariant && (
              <p role="alert" className="text-sm text-danger">
                Escolha {pendingVariants.map((variant) => variant.name.toLowerCase()).join(" e ")} para continuar.
              </p>
            )}

            {/* Quantidade */}
            {product.available && remaining > 0 && (
              <QuantitySelector
                value={selectedQuantity}
                min={1}
                max={remaining}
                onChange={setQuantity}
              />
            )}

            {/* Comprar */}
            <div className="space-y-3 border-t border-border pt-6">
              {product.available && remaining === 0 ? (
                <>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => navigate("/user/carrinho")}
                  >
                    Ver carrinho
                  </Button>

                  <p className="text-center text-xs text-text-secondary">
                    Todas as unidades disponíveis já estão no seu carrinho.
                  </p>
                </>
              ) : (
                <AddToCartButton
                  available={product.available}
                  onClick={handleAddToCart}
                />
              )}

              {produto.ativo === false && (
                <p className="text-center text-xs text-text-secondary">
                  Este produto não está mais à venda.
                </p>
              )}

              {produto.ativo !== false && (loja.aceita_pedidos === false || loja.ativa === false) && (
                <p className="text-center text-xs text-text-secondary">
                  A loja não está recebendo pedidos no momento.
                </p>
              )}

              {loja.exibir_estoque !== false && product.available && remaining > 0 && product.stock <= 10 && (
                <p className="text-center text-xs text-text-secondary">
                  {product.stock}{" "}
                  {product.stock === 1
                    ? "unidade restante"
                    : "unidades restantes"}
                </p>
              )}

              {inCart > 0 && remaining > 0 && (
                <button
                  type="button"
                  onClick={() => navigate("/user/carrinho")}
                  className="
                    w-full
                    text-center
                    text-sm
                    font-medium
                    text-text
                    underline
                    underline-offset-4
                    transition-opacity
                    hover:opacity-60
                  "
                >
                  {inCart} no carrinho · ver carrinho
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Características */}
        {product.attributes.length > 0 && (
          <section className="mt-12 border-t border-border pt-10">
            <ProductAttributes attributes={product.attributes} />
          </section>
        )}
      </div>
    </main>
  );
}
