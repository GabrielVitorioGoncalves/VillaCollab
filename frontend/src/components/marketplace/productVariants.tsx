export interface ProductVariantOption {
  id: string;
  label: string;
}

export interface ProductVariant {
  id: string;
  name: string;
  options: ProductVariantOption[];
}

interface ProductVariantsProps {
  variants: ProductVariant[];
  selectedValues: Record<string, string>;
  onChange: (variantId: string, optionId: string) => void;
}

export function ProductVariants({
  variants,
  selectedValues,
  onChange,
}: ProductVariantsProps) {
  if (variants.length === 0) {
    return null;
  }

  return (
    <section className="space-y-6">
      {variants.map((variant) => (
        <div key={variant.id} className="space-y-3">
          <h3 className="text-sm font-medium text-text">
            {variant.name}
          </h3>

          <div className="flex flex-wrap gap-2">
            {variant.options.map((option) => {
              const selected =
                selectedValues[variant.id] === option.id;

              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => onChange(variant.id, option.id)}
                  className={`
                    rounded-lg
                    border
                    px-4
                    py-2
                    text-sm
                    transition-colors

                    ${
                      selected
                        ? "border-primary bg-primary text-white"
                        : "border-border bg-surface text-text hover:bg-background-secondary"
                    }
                  `}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </section>
  );
}