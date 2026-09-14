import { ProductCard, type Product } from "./productCard";

interface ProductGridProps {
  products: Product[];
  onViewProduct?: (product: Product) => void;
  onAddToCart?: (product: Product) => void;
  emptyMessage?: string;
}

export function ProductGrid({
  products,
  onViewProduct,
  onAddToCart,
  emptyMessage = "Nenhum produto encontrado.",
}: ProductGridProps) {
  if (products.length === 0) {
    return (
      <div className="flex min-h-48 items-center justify-center rounded-lg border border-dashed border-border">
        <p className="text-sm text-text-secondary">
          {emptyMessage}
        </p>
      </div>
    );
  }

  return (
    <div
      className="
        grid
        grid-cols-2
        gap-4
        sm:grid-cols-3
        lg:grid-cols-4
        xl:grid-cols-5
      "
    >
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          onView={onViewProduct}
          onAddToCart={onAddToCart}
        />
      ))}
    </div>
  );
}