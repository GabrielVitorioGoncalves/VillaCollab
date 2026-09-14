import { ArrowRight } from "lucide-react";

import { Button } from "../ui/button";
import { Card } from "../ui/card";

export interface Store {
  id: string;
  name: string;
  logo?: string;
  banner?: string;
  description?: string;
  productCount?: number;
  category?: string;
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
    <Card className="group overflow-hidden transition-shadow duration-200 hover:shadow-md">

      {/* Banner */}
      <div className="relative h-28 overflow-hidden bg-background">

        {store.banner ? (
          <img
            src={store.banner}
            alt=""
            className="
              h-full
              w-full
              object-cover
              transition-transform
              duration-300
              group-hover:scale-105
            "
          />
        ) : (
          <div className="h-full w-full bg-background" />
        )}

      </div>

      {/* Conteúdo */}
      <div className="relative px-5 pb-5">

        {/* Logo */}
        <div className="-mt-8 mb-3 flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl border-4 border-white bg-white shadow-sm">

          {store.logo ? (
            <img
              src={store.logo}
              alt={store.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-xl font-bold text-text-secondary">
              {store.name.charAt(0).toUpperCase()}
            </span>
          )}

        </div>

        <h3 className="font-semibold text-text">
          {store.name}
        </h3>

        {store.category && (
          <p className="mt-1 text-xs text-text-secondary">
            {store.category}
          </p>
        )}

        {store.description && (
          <p className="mt-3 line-clamp-2 text-sm text-text-secondary">
            {store.description}
          </p>
        )}

        {store.productCount !== undefined && (
          <p className="mt-3 text-xs text-text-secondary">
            {store.productCount} produtos
          </p>
        )}

        <Button
          variant="outline"
          className="mt-4 w-full"
          onClick={() => onView?.(store)}
        >
          Ver loja
          <ArrowRight size={16} />
        </Button>

      </div>

    </Card>
  );
}