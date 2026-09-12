import { useEffect, useState } from "react";
import { Menu } from "lucide-react";

//import { supabase } from "../lib/supabase";

interface Store {
  id: string;
  name: string;
  category: string;
  description?: string;
  banner_url?: string;
  logo_url?: string;
  rating?: number;
}

export function Home() {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadStores() {
      setLoading(true);
      setError("");

      const { data, error } = await supabase
        .from("stores")
        .select(
          "id, name, category, description, banner_url, logo_url, rating"
        )
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Erro ao carregar lojas:", error);
        setError("Não foi possível carregar as lojas.");
        setLoading(false);
        return;
      }

      setStores(data ?? []);
      setLoading(false);
    }

    loadStores();
  }, []);

  return (
    <main className="min-h-screen bg-[#F5F5F5]">
      {/* =========================
          HEADER
          ========================= */}
      <header className="h-[70px] bg-white">
        <div className="flex h-full items-center justify-between px-6">
          <span className="text-[20px] font-extrabold text-black">
            A Villa
          </span>

          <button
            type="button"
            aria-label="Abrir menu"
            className="
              flex h-10 w-10
              items-center justify-center
              text-black
              transition-opacity
              hover:opacity-60
            "
          >
            <Menu size={28} />
          </button>
        </div>
      </header>

      {/* =========================
          CONTEÚDO
          ========================= */}
      <div className="mx-auto w-full max-w-[1353px] px-5 py-7">
        {/* =========================
            BANNER
            ========================= */}
        <section
          className="
            h-[271px]
            w-full
            overflow-hidden
            rounded-[22px]
            bg-[#D9D9D9]
          "
        >
          <div className="flex h-full items-center justify-center">
            <span className="text-4xl font-medium text-[#999]">
              Banner
            </span>
          </div>
        </section>

        {/* =========================
            LOJAS
            ========================= */}
        <section className="mt-8">
          <div className="mb-5">
            <h1 className="text-[24px] font-bold text-[#111]">
              Lojas
            </h1>

            <p className="mt-1 text-sm text-[#666]">
              Encontre produtos de diferentes lojas em um só lugar.
            </p>
          </div>

          {/* Loading */}
          {loading && (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              {[1, 2, 3, 4].map((item) => (
                <div
                  key={item}
                  className="
                    overflow-hidden
                    rounded-xl
                    bg-white
                    shadow-[0px_2px_8px_rgba(0,0,0,0.05)]
                  "
                >
                  <div className="h-[120px] animate-pulse bg-[#D9D9D9]" />

                  <div className="flex items-center gap-4 p-4">
                    <div className="h-[50px] w-[50px] animate-pulse rounded-full bg-[#D9D9D9]" />

                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-32 animate-pulse rounded bg-[#D9D9D9]" />
                      <div className="h-3 w-20 animate-pulse rounded bg-[#D9D9D9]" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Erro */}
          {!loading && error && (
            <div className="rounded-xl bg-white p-8 text-center">
              <p className="text-sm text-[#666]">
                {error}
              </p>
            </div>
          )}

          {/* Nenhuma loja */}
          {!loading && !error && stores.length === 0 && (
            <div className="rounded-xl bg-white p-10 text-center">
              <h2 className="text-lg font-semibold text-[#111]">
                Nenhuma loja encontrada
              </h2>

              <p className="mt-2 text-sm text-[#666]">
                Novas lojas aparecerão aqui assim que forem cadastradas.
              </p>
            </div>
          )}

          {/* Lojas */}
          {!loading && !error && stores.length > 0 && (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              {stores.map((store) => (
                <button
                  key={store.id}
                  type="button"
                  className="
                    overflow-hidden
                    rounded-xl
                    bg-white
                    text-left
                    shadow-[0px_2px_8px_rgba(0,0,0,0.05)]
                    transition-shadow
                    hover:shadow-[0px_4px_12px_rgba(0,0,0,0.10)]
                  "
                >
                  {/* Banner da loja */}
                  <div className="h-[120px] overflow-hidden bg-[#D9D9D9]">
                    {store.banner_url ? (
                      <img
                        src={store.banner_url}
                        alt={`Banner da ${store.name}`}
                        className="
                          h-full
                          w-full
                          object-cover
                        "
                      />
                    ) : (
                      <div
                        className="
                          flex h-full
                          items-center justify-center
                          text-3xl
                          font-medium
                          text-[#999]
                        "
                      >
                        400 × 120
                      </div>
                    )}
                  </div>

                  {/* Informações da loja */}
                  <div className="flex items-center gap-4 p-4">
                    {/* Logo */}
                    <div
                      className="
                        flex h-[50px] w-[50px]
                        shrink-0
                        items-center justify-center
                        overflow-hidden
                        rounded-full
                        bg-[#D9D9D9]
                      "
                    >
                      {store.logo_url ? (
                        <img
                          src={store.logo_url}
                          alt={`Logo da ${store.name}`}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="text-[9px] text-[#888]">
                          50 × 50
                        </span>
                      )}
                    </div>

                    {/* Nome e categoria */}
                    <div className="min-w-0 flex-1">
                      <h2 className="truncate text-[15px] font-bold text-[#111]">
                        {store.name}
                      </h2>

                      <p className="mt-0.5 truncate text-[12px] text-[#666]">
                        {store.category}
                      </p>
                    </div>

                    {/* Avaliação */}
                    {store.rating !== undefined && (
                      <div
                        className="
                          shrink-0
                          rounded-[6px]
                          bg-[#111]
                          px-2
                          py-1
                          text-[10px]
                          text-white
                        "
                      >
                        ⭐ {store.rating.toFixed(1)}
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}