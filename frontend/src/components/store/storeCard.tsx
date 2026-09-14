import { Card } from "../ui/card";

import { StoreInfo } from "./storeInfo";

export interface Store {
  id: string;
  name: string;
  category: string;
  description: string;
  productCount: number;
}

interface StoreCardProps {
  store: Store;
  onView?: (store: Store) => void;
}

export function StoreCard({
  store,
  onView,
}: StoreCardProps) {
  return (
    <Card className="group transition-shadow duration-200 hover:shadow-md">
      <button
        type="button"
        onClick={() => onView?.(store)}
        className="block w-full cursor-pointer text-left"
      >
        <StoreInfo
          name={store.name}
          category={store.category}
          description={store.description}
          productCount={store.productCount}
        />
      </button>
    </Card>
  );
}