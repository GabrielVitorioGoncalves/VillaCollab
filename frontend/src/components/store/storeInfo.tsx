interface StoreInfoProps {
  name: string;
  category?: string;
  description?: string;
  productCount?: number;
}

export function StoreInfo({
  name,
  category,
  description,
  productCount,
}: StoreInfoProps) {
  return (
    <div className="space-y-2">
      <div>
        {category && (
          <p className="mb-1 text-xs text-text-secondary">
            {category}
          </p>
        )}

        <h3 className="text-base font-semibold text-text">
          {name}
        </h3>
      </div>

      {description && (
        <p className="line-clamp-2 text-sm text-text-secondary">
          {description}
        </p>
      )}

      {productCount !== undefined && (
        <p className="text-xs text-text-secondary">
          {productCount} produtos
        </p>
      )}
    </div>
  );
}