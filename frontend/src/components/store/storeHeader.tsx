interface StoreHeaderProps {
  name: string;
  category?: string;
  description?: string;
}

export function StoreHeader({
  name,
  category,
  description,
}: StoreHeaderProps) {
  return (
    <div className="space-y-3 border-b border-border pb-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-text">
            {name}
          </h1>

          {category && (
            <p className="text-sm text-text-secondary">
              {category}
            </p>
          )}
        </div>
      </div>

      {description && (
        <p className="max-w-2xl text-sm text-text-secondary">
          {description}
        </p>
      )}
    </div>
  );
}