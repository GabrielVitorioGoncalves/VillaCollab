import { StoreCard, type Store } from "./storeCard";

interface StoreGridProps {
  stores: Store[];
  onViewStore?: (store: Store) => void;
  emptyMessage?: string;
}

export function StoreGrid({
  stores,
  onViewStore,
  emptyMessage = "Nenhuma loja encontrada.",
}: StoreGridProps) {
  if (stores.length === 0) {
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
        gap-5
        sm:grid-cols-2
        lg:grid-cols-3
        xl:grid-cols-4
      "
    >
      {stores.map((store) => (
        <StoreCard
          key={store.id}
          store={store}
          onView={onViewStore}
        />
      ))}
    </div>
  );
}