import {
  ArrowDownRight,
  ArrowUpRight,
  ClipboardList,
  Package,
  ShoppingBag,
  Wallet,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Card } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { PageHeader } from "../../components/layout/pageHeader";
import { RequestStatus } from "../../components/ui/requestStatus";
import { useStore } from "../../components/layout/storeContext";
import { useRequest } from "../../hooks/useRequest";
import { formatCurrency, formatShortDate, shortOrderId, toNumber } from "../../lib/format";
import { getMyStoreSummary, listStoreOrdersPage } from "../../lib/services";
import { storeStatusLabel, storeStatusStyle } from "../../lib/storeOrderStatus";
import { telefoneWhatsappValido } from "../../lib/whatsapp";

async function loadDashboard() {
  const [resumo, recentes] = await Promise.all([getMyStoreSummary(), listStoreOrdersPage(1, 5)]);
  return { resumo, recentes: recentes.itens };
}

function comparacaoMensal(atual: number, anterior: number) {
  if (anterior === 0) {
    return { text: atual > 0 ? "Primeiras vendas" : "Sem movimento", positive: atual > 0, description: "comparado ao mês anterior" };
  }
  const change = ((atual - anterior) / anterior) * 100;
  const formatted = `${change >= 0 ? "+" : ""}${change.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
  return { text: formatted, positive: change >= 0, description: "em relação ao mês anterior" };
}

export function Dashboard() {
  const navigate = useNavigate();
  const { loja } = useStore();
  const { data, loading, error, reload } = useRequest("painel", loadDashboard);

  if (!data) {
    return (
      <div className="space-y-8">
        <PageHeader
          title="Dashboard"
          description="Acompanhe o desempenho e a atividade da sua loja."
        />
        <RequestStatus loading={loading} error={error} onRetry={reload} loadingText="Carregando dados da loja..." />
      </div>
    );
  }

  const { resumo, recentes } = data;
  const vendas = toNumber(resumo.pedidos.vendas);
  const pendentes = resumo.pedidos.pendentes;
  const semEstoque = resumo.produtos.sem_estoque;
  const ativos = resumo.produtos.ativos_na_vitrine;
  const vendasMes = comparacaoMensal(toNumber(resumo.pedidos.vendas_mes), toNumber(resumo.pedidos.vendas_mes_anterior));
  const pedidosMes = comparacaoMensal(resumo.pedidos.mes, resumo.pedidos.mes_anterior);
  const estoqueBaixo = loja.notificacoes?.estoque_baixo ? resumo.estoque_baixo : [];

  const stats = [
    {
      title: "Vendas totais",
      value: formatCurrency(vendas),
      variation: vendasMes.text,
      positive: vendasMes.positive,
      description: vendasMes.description,
      icon: Wallet,
    },
    {
      title: "Pedidos recebidos",
      value: String(resumo.pedidos.total),
      variation: pedidosMes.text,
      positive: pedidosMes.positive,
      description: pedidosMes.description,
      icon: ShoppingBag,
    },
    {
      title: "Produtos cadastrados",
      value: String(resumo.produtos.total),
      variation: `${semEstoque} sem estoque`,
      positive: false,
      description: `${ativos} ${ativos === 1 ? "ativo" : "ativos"} na vitrine`,
      icon: Package,
    },
    {
      title: "Pedidos pendentes",
      value: String(pendentes),
      variation: pendentes > 0 ? "Requer atenção" : "Tudo em dia",
      positive: false,
      description: "aguardando confirmação",
      icon: ClipboardList,
    },
  ];

  const recentOrders = recentes;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description="Acompanhe o desempenho e a atividade da sua loja."
        action={
          <Button onClick={() => navigate("/store/produtos/novo")}>
            Novo produto
          </Button>
        }
      />

      {loja.ativa === false && (
        <Card className="border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">
            Sua loja foi desativada pela administração da plataforma: ela não aparece no marketplace e não recebe
            pedidos. Fale com o suporte para reativá-la.
          </p>
        </Card>
      )}

      {loja.ativa !== false && !telefoneWhatsappValido(loja.telefone) && (
        <Card className="border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">
            Sua loja ainda não tem um WhatsApp válido cadastrado, e sem ele os clientes não conseguem finalizar a
            compra.{" "}
            <button
              type="button"
              onClick={() => navigate("/store/minha-loja")}
              className="font-medium underline underline-offset-4"
            >
              Cadastrar o WhatsApp
            </button>
          </p>
        </Card>
      )}

      {loja.ativa !== false && loja.aceita_pedidos === false && (
        <Card className="border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">
            Sua loja não está recebendo pedidos. Os clientes veem os produtos, mas não conseguem finalizar a compra.{" "}
            <button
              type="button"
              onClick={() => navigate("/store/configuracoes")}
              className="font-medium underline underline-offset-4"
            >
              Alterar nas configurações
            </button>
          </p>
        </Card>
      )}

      {loja.notificacoes?.pedidos !== false && pendentes > 0 && (
        <Card className="border-yellow-200 bg-yellow-50 p-4">
          <p className="text-sm text-yellow-800">
            {pendentes === 1
              ? "1 pedido aguarda sua confirmação."
              : `${pendentes} pedidos aguardam sua confirmação.`}{" "}
            <button
              type="button"
              onClick={() => navigate("/store/pedidos")}
              className="font-medium underline underline-offset-4"
            >
              Ver pedidos
            </button>
          </p>
        </Card>
      )}

      <section>
        <div className="mb-4">
          <h2 className="text-base font-semibold text-text">
            Visão geral
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => {
            const Icon = stat.icon;

            return (
              <Card key={stat.title} className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-medium text-text-secondary">
                    {stat.title}
                  </p>

                  <div className="rounded-lg bg-background-secondary p-2">
                    <Icon size={19} className="text-text-secondary" />
                  </div>
                </div>

                <p className="mt-4 text-2xl font-bold tracking-tight text-text">
                  {stat.value}
                </p>

                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  {stat.positive ? (
                    <ArrowUpRight size={15} className="text-success" />
                  ) : (
                    <ArrowDownRight size={15} className="text-text-secondary" />
                  )}

                  <span
                    className={`text-xs font-medium ${
                      stat.positive ? "text-success" : "text-text-secondary"
                    }`}
                  >
                    {stat.variation}
                  </span>
                </div>

                <p className="mt-1 text-xs text-text-secondary">
                  {stat.description}
                </p>
              </Card>
            );
          })}
        </div>
      </section>

      {estoqueBaixo.length > 0 && (
        <section>
          <Card className="border-yellow-200 bg-yellow-50 p-5">
            <h2 className="text-sm font-semibold text-yellow-800">
              Estoque baixo
            </h2>
            <ul className="mt-2 space-y-1 text-sm text-yellow-800">
              {estoqueBaixo.map((produto) => (
                <li key={produto.id}>
                  <button
                    type="button"
                    onClick={() => navigate(`/store/produtos/${produto.id}/editar`)}
                    className="underline-offset-4 hover:underline"
                  >
                    {produto.nome}: {produto.estoque} {produto.estoque === 1 ? "unidade" : "unidades"}
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        </section>
      )}

      <section>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-text">
              Pedidos recentes
            </h2>
          </div>

          <Button
            variant="outline"
            onClick={() => navigate("/store/pedidos")}
          >
            Ver todos os pedidos
          </Button>
        </div>

        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[650px] text-left text-sm">
              <thead className="border-b border-border bg-background">
                <tr>
                  <th className="px-5 py-3.5 font-medium text-text-secondary">
                    Pedido
                  </th>
                  <th className="px-5 py-3.5 font-medium text-text-secondary">
                    Cliente
                  </th>
                  <th className="px-5 py-3.5 font-medium text-text-secondary">
                    Data
                  </th>
                  <th className="px-5 py-3.5 font-medium text-text-secondary">
                    Total
                  </th>
                  <th className="px-5 py-3.5 font-medium text-text-secondary">
                    Status
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-border">
                {recentOrders.map((order) => (
                  <tr
                    key={order.id}
                    onClick={() => navigate(`/store/pedidos/${order.id}`)}
                    className="cursor-pointer transition-colors hover:bg-background/70"
                  >
                    <td className="px-5 py-4 font-medium text-text">
                      #{shortOrderId(order.id)}
                    </td>
                    <td className="px-5 py-4 text-text">
                      {order.cliente?.nome ?? "Cliente"}
                    </td>
                    <td className="px-5 py-4 text-text-secondary">
                      {formatShortDate(order.created_at)}
                    </td>
                    <td className="px-5 py-4 font-medium text-text">
                      {formatCurrency(order.total)}
                    </td>
                    <td className="px-5 py-4">
                      <Badge className={storeStatusStyle[order.status]}>
                        {storeStatusLabel[order.status]}
                      </Badge>
                    </td>
                  </tr>
                ))}

                {recentOrders.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-center text-sm text-text-secondary">
                      Nenhum pedido ainda. Os pedidos feitos na sua loja aparecem aqui.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </section>
    </div>
  );
}
