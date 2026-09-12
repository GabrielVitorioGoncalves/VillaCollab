import { Price } from "./price";

interface ProductInfoProps {
  name: string;
  storeName: string;
  category?: string;
  price: number;
  oldPrice?: number;
}

export function ProductInfo({
  name,
  storeName,
  category,
  price,
  oldPrice,
}: ProductInfoProps) {
  return (
    <div className="space-y-3">
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
    </div>
  );
}