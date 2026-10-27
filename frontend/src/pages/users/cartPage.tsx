import { useNavigate } from "react-router-dom";

import { CartItem } from "../../components/cart/cartItem";
import { CartSummary } from "../../components/cart/cartSummary";
import { quantityInCart, useCart } from "../../contexts/cartContext";
import { useRequest } from "../../hooks/useRequest";
import { cartSubtotal, fetchCartProducts, groupByStore, lineProblem } from "../../lib/cart";
import { getToken } from "../../lib/session";

export function CartPage() {
  const navigate = useNavigate();
  const { lines, setQuantity, removeItem, syncProducts } = useCart();

  // Ao abrir o carrinho, confere preço e estoque atuais na API.
  const sync = useRequest(lines.length > 0 ? "carrinho" : null, async () => {
    const products = await fetchCartProducts([...new Set(lines.map((line) => line.productId))]);
    syncProducts(products);
    return true;
  });

  const subtotal = cartSubtotal(lines);
  const shipping = 0;
  const storeCount = groupByStore(lines).length;
  const hasProblems = lines.some((line) => lineProblem(line, lines) !== undefined);

  function handleCheckout() {
    if (!getToken()) {
      navigate("/", { state: { from: "/user/pagamento" } });
      return;
    }
    navigate("/user/pagamento");
  }

  function handleContinueShopping() {
    navigate("/user/home");
  }

  if (lines.length === 0) {
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
                  {lines.length}{" "}
                  {lines.length === 1
                    ? "item no carrinho"
                    : "itens no carrinho"}
                </p>

                {sync.error && (
                  <p className="mt-2 text-sm text-text-secondary">
                    Não conseguimos conferir o estoque agora. Os valores serão
                    confirmados pela loja ao fechar o pedido.
                  </p>
                )}
              </div>

              <div className="space-y-4">
                {lines.map((line) => (
                  <CartItem
                    key={line.key}
                    product={{
                      id: line.productId,
                      name: line.name,
                      image: line.image,
                      price: line.price,
                      storeName: line.storeName,
                      details: line.variantLabel,
                    }}
                    quantity={line.quantity}
                    maxQuantity={line.stock - quantityInCart(lines, line.productId, line.key)}
                    warning={lineProblem(line, lines)}
                    onView={() =>
                      navigate(`/user/detalhesProduto/${line.productId}`)
                    }
                    onQuantityChange={(quantity) =>
                      setQuantity(line.key, quantity)
                    }
                    onRemove={() => removeItem(line.key)}
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
              checkoutDisabled={hasProblems || sync.loading}
              checkoutLabel={sync.loading ? "Conferindo estoque..." : "Finalizar compra"}
              note={
                hasProblems
                  ? "Resolva os avisos nos produtos para continuar."
                  : storeCount > 1
                    ? `Seu carrinho tem produtos de ${storeCount} lojas. Cada loja recebe um pedido separado.`
                    : undefined
              }
            />
          </aside>
        </section>
      </div>
    </main>
  );
}
