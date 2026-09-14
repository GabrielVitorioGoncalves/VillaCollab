import { StoreGrid } from "../../components/marketplace/storeGrid";
import type { Store } from "../../components/marketplace/storeCard";

const stores: Store[] = [
  {
    id: "1",
    name: "Urban Store",
    category: "Moda",
    description: "Moda urbana e acessórios.",
    productCount: 124,
  },
  {
    id: "2",
    name: "Tech House",
    category: "Eletrônicos",
    description: "Tecnologia e acessórios para o dia a dia.",
    productCount: 87,
  },
  {
    id: "3",
    name: "Street Wear",
    category: "Moda",
    description: "Roupas e acessórios urbanos.",
    productCount: 63,
  },
  {
    id: "4",
    name: "Casa & Estilo",
    category: "Casa e decoração",
    description: "Produtos para deixar sua casa ainda melhor.",
    productCount: 52,
  },
];

export function Home() {
  const handleViewStore = (store: Store) => {
    console.log("Abrir loja:", store);
  };

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-[1353px] px-5 py-7">
        {/* Banner */}
        <section
          className="
            h-[271px]
            w-full
            overflow-hidden
            rounded-[22px]
            bg-background-secondary
          "
        >
          <div className="flex h-full items-center justify-center">
            <span className="text-4xl font-medium text-muted">
              Banner
            </span>
          </div>
        </section>

        {/* Lojas */}
        <section className="mt-8">
          <div className="mb-5">
            <h1 className="text-2xl font-bold text-text">
              Lojas
            </h1>

            <p className="mt-1 text-sm text-text-secondary">
              Encontre produtos de diferentes lojas em um só lugar.
            </p>
          </div>

          <StoreGrid
            stores={stores}
            onViewStore={handleViewStore}
            emptyMessage="Nenhuma loja encontrada."
          />
        </section>
      </div>
    </main>
  );
}