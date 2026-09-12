import { ShoppingCart } from "lucide-react";

import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Price } from "./price";

export interface Product {
  id: string;
  name: string;
  image?: string;
  price: number;
  oldPrice?: number;
  storeName: string;
  category?: string;
  available?: boolean;
  discount?: number;
}

interface ProductCardProps {
  product: Product;
  onView?: (product: Product) => void;
  onAddToCart?: (product: Product) => void;
}

export function ProductCard({
  product,
  onView,
  onAddToCart,
}: ProductCardProps) {
  const {
    name,
    image,
    price,
    oldPrice,
    storeName,
    category,
    available = true,
    discount,
  } = product;

  return (
    <Card className="group overflow-hidden transition-shadow duration-200 hover:shadow-md">

      {/* Imagem */}
      <button
        type="button"
        onClick={() => onView?.(product)}
        className="relative block w-full cursor-pointer"
      >
        <div className="aspect-square overflow-hidden bg-background">

          {image ? (
            <img
              src={image}
              alt={name}
              className="
                h-full
                w-full
                object-cover
                transition-transform
                duration-300
                group-hover:scale-105
              "
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-text-secondary">
              Sem imagem
            </div>
          )}

        </div>

        {/* Desconto */}
        {discount !== undefined && (
          <div className="absolute left-3 top-3">
            <Badge variant="danger">
              -{discount}%
            </Badge>
          </div>
        )}

        {/* Indisponível */}
        {!available && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <span className="rounded-md bg-white px-3 py-1.5 text-sm font-medium text-text">
              Indisponível
            </span>
          </div>
        )}
      </button>

      {/* Informações */}
      <div className="space-y-3 p-4">

        <div>
          {category && (
            <p className="mb-1 text-xs text-text-secondary">
              {category}
            </p>
          )}

          <h3 className="line-clamp-2 min-h-10 text-sm font-medium text-text">
            {name}
          </h3>

          <p className="mt-1 text-xs text-text-secondary">
            {storeName}
          </p>
        </div>

        <Price
          value={price}
          oldValue={oldPrice}
        />

        <Button
          className="w-full"
          disabled={!available}
          onClick={() => onAddToCart?.(product)}
        >
          <ShoppingCart size={17} />
          {available ? "Adicionar ao carrinho" : "Indisponível"}
        </Button>

      </div>
    </Card>
  );
}