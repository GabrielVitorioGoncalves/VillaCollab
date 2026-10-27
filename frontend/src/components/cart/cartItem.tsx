import { Minus, Plus, Trash2 } from "lucide-react";

import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Price } from "../marketplace/price";
import { ProductImage } from "../marketplace/productImage";

export interface CartProduct {
  id: string;
  name: string;
  image?: string;
  price: number;
  storeName: string;
  // Variações escolhidas, ex.: "Tamanho: M · Cor: Preto".
  details?: string;
}

interface CartItemProps {
  product: CartProduct;
  quantity: number;
  maxQuantity?: number;
  warning?: string;
  onView?: () => void;
  onQuantityChange?: (quantity: number) => void;
  onRemove?: () => void;
}

export function CartItem({
  product,
  quantity,
  maxQuantity,
  warning,
  onView,
  onQuantityChange,
  onRemove,
}: CartItemProps) {
  const subtotal = product.price * quantity;
  const atMax = maxQuantity !== undefined && quantity >= maxQuantity;

  const decreaseQuantity = () => {
    if (quantity > 1) {
      onQuantityChange?.(quantity - 1);
    }
  };

  const increaseQuantity = () => {
    if (!atMax) {
      onQuantityChange?.(quantity + 1);
    }
  };

  return (
    <Card className="p-4">
      <div className="flex gap-4">
        {/* Imagem */}
        <div className="w-24 shrink-0">
          <ProductImage
            image={product.image}
            alt={product.name}
          />
        </div>

        {/* Informações */}
        <div className="flex min-w-0 flex-1 flex-col justify-between gap-4">
          <div>
            <h3 className="font-medium text-text">
              {onView ? (
                <button
                  type="button"
                  onClick={onView}
                  className="text-left transition-opacity hover:opacity-60"
                >
                  {product.name}
                </button>
              ) : (
                product.name
              )}
            </h3>

            <p className="mt-1 text-sm text-text-secondary">
              {product.storeName}
            </p>

            {product.details && (
              <p className="mt-1 text-sm text-text">
                {product.details}
              </p>
            )}

            <div className="mt-2">
              <Price value={product.price} />
            </div>

            {warning && (
              <p className="mt-2 text-sm text-danger">
                {warning}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Quantidade */}
            <div className="flex items-center rounded-lg border border-border">
              <button
                type="button"
                onClick={decreaseQuantity}
                disabled={quantity <= 1}
                aria-label="Diminuir quantidade"
                className="
                  flex h-9 w-9 items-center justify-center
                  text-text
                  transition-colors
                  hover:bg-background-secondary
                  disabled:cursor-not-allowed
                  disabled:opacity-40
                "
              >
                <Minus size={16} />
              </button>

              <span className="flex h-9 min-w-10 items-center justify-center border-x border-border text-sm font-medium">
                {quantity}
              </span>

              <button
                type="button"
                onClick={increaseQuantity}
                disabled={atMax}
                aria-label="Aumentar quantidade"
                className="
                  flex h-9 w-9 items-center justify-center
                  text-text
                  transition-colors
                  hover:bg-background-secondary
                  disabled:cursor-not-allowed
                  disabled:opacity-40
                "
              >
                <Plus size={16} />
              </button>
            </div>

            {/* Subtotal */}
            <div className="text-right">
              <p className="text-xs text-text-secondary">
                Subtotal
              </p>

              <Price value={subtotal} />
            </div>

            {/* Remover */}
            <Button
              variant="ghost"
              onClick={onRemove}
              aria-label={`Remover ${product.name}`}
            >
              <Trash2 size={17} />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}