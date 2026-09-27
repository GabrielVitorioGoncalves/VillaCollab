import { useMemo, useState } from "react";

import {
  CartItem,
  type CartProduct,
} from "../../components/cart/cartItem";

import { CartSummary } from "../../components/cart/cartSummary";

interface CartItemData {
  id: string;
  product: CartProduct;
  quantity: number;
}

const initialCartItems: CartItemData[] = [
  {
    id: "cart-1",
    product: {
      id: "1",
      name: "Tênis Casual Urbano",
      image: "",
      price: 199.9,
      storeName: "Urban Store",
    },
    quantity: 1,
  },
  {
    id: "cart-2",
    product: {
      id: "2",
      name: "Camiseta Oversized",
      image: "",
      price: 89.9,
      storeName: "Urban Store",
    },
    quantity: 2,
  },
  {
    id: "cart-3",
    product: {
      id: "3",
      name: "Mochila Minimalista",
      image: "",
      price: 149.9,
      storeName: "Urban Store",
    },
    quantity: 1,
  },
];

export function CartPage() {
  const [cartItems, setCartItems] =
    useState<CartItemData[]>(initialCartItems);

  const subtotal = useMemo(() => {
    return cartItems.reduce(
      (total, item) =>
        total + item.product.price * item.quantity,
      0
    );
  }, [cartItems]);

  const shipping = 0;

  function handleQuantityChange(
    itemId: string,
    quantity: number
  ) {
    setCartItems((current) =>
      current.map((item) =>
        item.id === itemId
          ? {
              ...item,
              quantity,
            }
          : item
      )
    );
  }

  function handleRemove(itemId: string) {
    setCartItems((current) =>
      current.filter((item) => item.id !== itemId)
    );
  }

  function handleCheckout() {
    console.log("Finalizar compra:", {
      items: cartItems,
      subtotal,
      shipping,
      total: subtotal + shipping,
    });
  }

  function handleContinueShopping() {
    console.log("Continuar comprando");
  }

  if (cartItems.length === 0) {
    return (
      <main className="min-h-screen bg-background">
        <div className="mx-auto w-full max-w-[1240px] px-5 py-10">
          <div
            className="
              rounded-[22px]
              border
              border-border
              bg-surface
              px-6
              py-16
              text-center
            "
          >
            <h1 className="text-2xl font-bold text-text">
              Seu carrinho está vazio
            </h1>

            <p className="mt-2 text-sm text-text-secondary">
              Adicione produtos ao carrinho para continuar.
            </p>

            <button
              type="button"
              onClick={handleContinueShopping}
              className="
                mt-6
                rounded-lg
                bg-primary
                px-5
                py-3
                text-sm
                font-medium
                text-white
                transition-colors
                hover:bg-primary-hover
              "
            >
              Continuar comprando
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-[1240px] px-5 py-10">
        {/* Cabeçalho */}
        <section className="mb-8">
          <h1 className="text-3xl font-bold text-text">
            Carrinho
          </h1>

          <p className="mt-1 text-sm text-text-secondary">
            Revise seus produtos antes de finalizar a compra.
          </p>
        </section>

        {/* Conteúdo */}
        <section
          className="
            grid
            gap-8
            lg:grid-cols-[minmax(0,1fr)_360px]
            lg:items-start
          "
        >
          {/* Lista de produtos */}
          <div className="space-y-4">
            <div
              className="
                rounded-[22px]
                border
                border-border
                bg-surface
                p-6
              "
            >
              <div className="mb-5">
                <h2 className="text-lg font-semibold text-text">
                  Produtos
                </h2>

                <p className="mt-1 text-sm text-text-secondary">
                  {cartItems.length}{" "}
                  {cartItems.length === 1
                    ? "item no carrinho"
                    : "itens no carrinho"}
                </p>
              </div>

              <div className="space-y-4">
                {cartItems.map((item) => (
                  <CartItem
                    key={item.id}
                    product={item.product}
                    quantity={item.quantity}
                    onQuantityChange={(quantity) =>
                      handleQuantityChange(
                        item.id,
                        quantity
                      )
                    }
                    onRemove={() =>
                      handleRemove(item.id)
                    }
                  />
                ))}
              </div>
            </div>

            {/* Continuar comprando */}
            <button
              type="button"
              onClick={handleContinueShopping}
              className="
                text-sm
                font-medium
                text-text
                underline
                underline-offset-4
                transition-opacity
                hover:opacity-60
              "
            >
              ← Continuar comprando
            </button>
          </div>

          {/* Resumo */}
          <aside className="lg:sticky lg:top-24">
            <CartSummary
              subtotal={subtotal}
              shipping={shipping}
              onCheckout={handleCheckout}
            />
          </aside>
        </section>
      </div>
    </main>
  );
}