import { ShoppingCart } from "lucide-react";

import { Button } from "../ui/button";

interface AddToCartButtonProps {
  available?: boolean;
  onClick?: () => void;
}

export function AddToCartButton({
  available = true,
  onClick,
}: AddToCartButtonProps) {
  return (
    <Button
      className="w-full"
      disabled={!available}
      onClick={onClick}
    >
      <ShoppingCart size={17} />

      {available
        ? "Adicionar ao carrinho"
        : "Indisponível"}
    </Button>
  );
}