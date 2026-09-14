import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Price } from "../marketplace/price";

interface CartSummaryProps {
  subtotal: number;
  shipping?: number;
  onCheckout?: () => void;
}

export function CartSummary({
  subtotal,
  shipping = 0,
  onCheckout,
}: CartSummaryProps) {
  const total = subtotal + shipping;

  return (
    <Card className="p-5">
      <h2 className="text-lg font-semibold text-text">
        Resumo do pedido
      </h2>

      <div className="mt-5 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-text-secondary">
            Subtotal
          </span>

          <Price value={subtotal} />
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-text-secondary">
            Frete
          </span>

          {shipping === 0 ? (
            <span className="text-sm font-medium text-text">
              Grátis
            </span>
          ) : (
            <Price value={shipping} />
          )}
        </div>

        <div className="border-t border-border pt-3">
          <div className="flex items-center justify-between">
            <span className="font-medium text-text">
              Total
            </span>

            <Price
              value={total}
              size="lg"
            />
          </div>
        </div>

        <Button
          className="mt-3 w-full"
          onClick={onCheckout}
        >
          Finalizar compra
        </Button>
      </div>
    </Card>
  );
}