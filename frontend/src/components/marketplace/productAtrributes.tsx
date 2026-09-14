export interface ProductAttribute {
  id: string;
  name: string;
  value: string;
}

interface ProductAttributesProps {
  attributes: ProductAttribute[];
  title?: string;
}

export function ProductAttributes({
  attributes,
  title = "Características",
}: ProductAttributesProps) {
  if (attributes.length === 0) {
    return null;
  }

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-text">
        {title}
      </h2>

      <div className="space-y-3">
        {attributes.map((attribute) => (
          <div
            key={attribute.id}
            className="
              flex
              items-start
              gap-8
              border-b
              border-border
              pb-3
            "
          >
            <span className="w-32 text-sm text-text-secondary">
              {attribute.name}
            </span>

            <span className="text-sm font-medium text-text">
              {attribute.value}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}