interface PriceProps {
  value: number;
  oldValue?: number;
  installment?: string;
  size?: "sm" | "md" | "lg";
}

export function Price({
  value,
  oldValue,
  installment,
  size = "md",
}: PriceProps) {
  const formattedValue = value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  const formattedOldValue = oldValue?.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  const sizeClasses = {
    sm: "text-base",
    md: "text-xl",
    lg: "text-2xl",
  };

  return (
    <div>
      {oldValue !== undefined && (
        <span className="block text-sm text-text-secondary line-through">
          {formattedOldValue}
        </span>
      )}

      <span
        className={`
          font-bold
          tracking-tight
          text-text
          ${sizeClasses[size]}
        `}
      >
        {formattedValue}
      </span>

      {installment && (
        <span className="ml-1 text-xs text-text-secondary">
          {installment}
        </span>
      )}
    </div>
  );
}