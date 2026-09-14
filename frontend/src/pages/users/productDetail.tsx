import { useState } from "react";

import { AddToCartButton } from "../../components/marketplace/addCartButton";

import {
  ProductAttributes,
  type ProductAttribute,
} from "../../components/marketplace/productAtrributes";

import {
  ProductVariants,
  type ProductVariant,
} from "../../components/marketplace/productVariants";

import { ProductGallery } from "../../components/marketplace/productGallery";
import { QuantitySelector } from "../../components/marketplace/quantitySelector";

interface Product {
  id: string;
  name: string;
  images: string[];
  price: number;
  oldPrice?: number;
  storeName: string;
  available: boolean;
  description?: string;
  rating?: number;
  reviewCount?: number;
  attributes: ProductAttribute[];
  variants: ProductVariant[];
  stock: number;
}

const product: Product = {
  id: "1",
  name: "Mouse Gamer G403",
  images: [
  "https://images.unsplash.com/photo-1527814050087-3793815479db",
  "https://images.unsplash.com/photo-1563297007-0686b7003af7",
  "https://images.unsplash.com/photo-1586920740199-6c5b8f9a0f5b",
  ],
  price: 249.9,
  oldPrice: 299.9,
  storeName: "Tech House",
  available: true,
  description:
    "Mouse gamer desenvolvido para oferecer precisão, conforto e desempenho durante o uso.",
  rating: 4.8,
  reviewCount: 124,
  stock: 15,

  attributes: [
    {
      id: "brand",
      name: "Marca",
      value: "Logitech",
    },
    {
      id: "model",
      name: "Modelo",
      value: "G403",
    },
    {
      id: "connection",
      name: "Conexão",
      value: "USB",
    },
    {
      id: "weight",
      name: "Peso",
      value: "87 g",
    },
  ],

  variants: [
    {
      id: "color",
      name: "Cor",
      options: [
        {
          id: "black",
          label: "Preto",
        },
        {
          id: "white",
          label: "Branco",
        },
      ],
    },
  ],
};

export function ProductDetail() {
  const [quantity, setQuantity] = useState(1);

  const [selectedVariants, setSelectedVariants] = useState<
    Record<string, string>
  >({});

  const handleVariantChange = (
    variantId: string,
    optionId: string
  ) => {
    setSelectedVariants((current) => ({
      ...current,
      [variantId]: optionId,
    }));
  };

  const handleAddToCart = () => {
    console.log("Adicionar ao carrinho:", {
      product,
      quantity,
      selectedVariants,
    });
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
              <p className="text-sm font-medium text-text-secondary">
                {product.storeName}
              </p>

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
                    ({product.reviewCount} avaliações)
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

                <p className="text-sm leading-6 text-text-secondary">
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

            {/* Quantidade */}
            <QuantitySelector
              value={quantity}
              min={1}
              max={product.stock}
              onChange={setQuantity}
            />

            {/* Comprar */}
            <div className="space-y-3 border-t border-border pt-6">
              <AddToCartButton
                available={product.available}
                onClick={handleAddToCart}
              />

              {product.stock <= 10 && (
                <p className="text-center text-xs text-text-secondary">
                  {product.stock}{" "}
                  {product.stock === 1
                    ? "unidade restante"
                    : "unidades restantes"}
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Características */}
        <section className="mt-12 border-t border-border pt-10">
          <ProductAttributes attributes={product.attributes} />
        </section>
      </div>
    </main>
  );
}