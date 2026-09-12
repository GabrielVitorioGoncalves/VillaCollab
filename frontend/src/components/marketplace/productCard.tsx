import { Badge } from "../ui/badge";
import { Card } from "../ui/card";

import { AddToCartButton } from "./addCartButton";
import { ProductImage } from "./productImage";
import { ProductInfo } from "./productInfo";

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
        <ProductImage
          image={image}
          alt={name}
        />

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
        <ProductInfo
          name={name}
          storeName={storeName}
          category={category}
          price={price}
          oldPrice={oldPrice}
        />

        <AddToCartButton
          available={available}
          onClick={() => onAddToCart?.(product)}
        />
      </div>
    </Card>
  );
}