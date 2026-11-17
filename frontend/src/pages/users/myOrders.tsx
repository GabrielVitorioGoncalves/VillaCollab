import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Price } from "../../components/marketplace/price";
import { RequestStatus } from "../../components/ui/requestStatus";
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useRequest } from "../../hooks/useRequest";
import { formatDate, orderStatusConfig, shortOrderId, toNumber } from "../../lib/format";
import { errorMessage } from "../../lib/api";
import { listMyOrdersPage, listStores } from "../../lib/services";
import type { Pedido } from "../../types/api";

const POR_PAGINA = 10;

async function loadOrders() {
  const [primeira, lojas] = await Promise.all([listMyOrdersPage(1, POR_PAGINA), listStores()]);
  const storeNames = new Map(lojas.map((loja) => [loja.id, loja.nome]));
  return { primeira, storeNames };
}

export function MyOrders() {
    const navigate = useNavigate();
    const location = useLocation();
    const createdCount = (location.state as { createdCount?: number } | null)?.createdCount;

    const { data, loading, error, reload } = useRequest("meus-pedidos", loadOrders);
    const [mais, setMais] = useState<Pedido[]>([]);
    const [paginaCarregada, setPaginaCarregada] = useState(1);
    const [carregandoMais, setCarregandoMais] = useState(false);
    const [erroMais, setErroMais] = useState("");
    const primeiros = data?.primeira.itens ?? [];
    const orders = [...primeiros, ...mais.filter((pedido) => !primeiros.some((item) => item.id === pedido.id))];
    const total = data?.primeira.total ?? 0;

    const carregarMais = async () => {
        if (carregandoMais) return;
        setCarregandoMais(true);
        setErroMais("");
        try {
            const proxima = await listMyOrdersPage(paginaCarregada + 1, POR_PAGINA);
            setMais((atual) => [...atual, ...proxima.itens.filter((pedido) => !atual.some((item) => item.id === pedido.id))]);
            setPaginaCarregada(proxima.pagina);
        } catch (caught) {
            setErroMais(errorMessage(caught));
        } finally {
            setCarregandoMais(false);
        }
    };

    const handleViewOrder = (id: string) => {
        navigate(`/user/pedidos/${id}`);
    };

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-[1240px] px-5 py-10">
        {/* Cabeçalho */}
        <section className="mb-8">
          <h1 className="text-3xl font-bold text-text">
            Histórico de pedidos
          </h1>

          <p className="mt-1 text-sm text-text-secondary">
            Consulte seus pedidos e acompanhe o status das suas compras.
          </p>
        </section>

        {createdCount !== undefined && createdCount > 0 && (
          <div
            role="status"
            className="mb-6 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"
          >
            {createdCount === 1
              ? "Pedido registrado. Abra o pedido e envie para a loja no WhatsApp para combinar o pagamento."
              : `${createdCount} pedidos registrados, um para cada loja. Abra cada um e envie para a loja no WhatsApp para combinar o pagamento.`}
          </div>
        )}

        {(loading || error) && (
          <RequestStatus
            loading={loading}
            error={error}
            onRetry={reload}
            loadingText="Carregando pedidos..."
          />
        )}

        {/* Lista de pedidos */}
        <section className="space-y-4">
          {orders.map((order) => {
            const status = orderStatusConfig[order.status] ?? orderStatusConfig.pendente;
            const storeName = data?.storeNames.get(order.loja_id) ?? "Loja";
            const units = order.itens_pedido.reduce(
              (total, item) => total + item.quantidade,
              0
            );

            return (
              <Card
                key={order.id}
                className="overflow-hidden"
              >
                {/* Cabeçalho do pedido */}
                <div
                  className="
                    flex
                    flex-col
                    gap-4
                    border-b
                    border-border
                    p-5
                    sm:flex-row
                    sm:items-center
                    sm:justify-between
                  "
                >
                  <div>
                    <h2 className="font-semibold text-text">
                      Pedido {shortOrderId(order.id)} - {storeName}
                    </h2>

                    <p className="mt-1 text-sm text-text-secondary">
                      Realizado em {formatDate(order.created_at)}
                    </p>
                  </div>

                  <Badge variant={status.variant}>
                    {status.label}
                  </Badge>
                </div>

                {/* Informações */}
                <div
                  className="
                    flex
                    flex-col
                    gap-5
                    p-5
                    sm:flex-row
                    sm:items-center
                    sm:justify-between
                  "
                >
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <p className="text-xs text-text-secondary">
                        Produtos
                      </p>

                      <p className="mt-1 text-sm font-medium text-text">
                        {units}{" "}
                        {units === 1
                          ? "item"
                          : "itens"}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-text-secondary">
                        Total
                      </p>

                      <div className="mt-1">
                        <Price
                          value={toNumber(order.total)}
                          size="sm"
                        />
                      </div>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    onClick={() => handleViewOrder(order.id)}
                  >
                    Ver pedido
                  </Button>
                </div>
              </Card>
            );
          })}
        </section>

        {data && orders.length < total && (
          <div className="mt-6 flex flex-col items-center gap-2">
            <p className="text-sm text-text-secondary">
              Mostrando {orders.length} de {total} pedidos
            </p>
            <Button variant="outline" disabled={carregandoMais} onClick={carregarMais}>
              {carregandoMais ? "Carregando..." : "Ver mais pedidos"}
            </Button>
            {erroMais && (
              <p role="alert" className="text-sm text-danger">
                {erroMais}
              </p>
            )}
          </div>
        )}

        {/* Estado vazio */}
        {data && orders.length === 0 && (
          <Card className="p-10">
            <div className="text-center">
              <h2 className="text-lg font-semibold text-text">
                Nenhum pedido encontrado
              </h2>

              <p className="mt-2 text-sm text-text-secondary">
                Seus pedidos aparecerão aqui após realizar uma compra.
              </p>

              <Button
                className="mt-6"
                variant="outline"
                onClick={() => navigate("/user/home")}
              >
                Ver lojas
              </Button>
            </div>
          </Card>
        )}
      </div>
    </main>
  );
}
