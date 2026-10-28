import { Download, Store, ShoppingBag, Wallet } from "lucide-react";

import { DataTable, type TableColumn } from "../../components/admin/dataTable";
import { StatCard } from "../../components/admin/statCard";
import { PageHeader } from "../../components/layout/pageHeader";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { RequestStatus } from "../../components/ui/requestStatus";
import { useRequest } from "../../hooks/useRequest";
import { formatCurrency } from "../../lib/format";
import { getAdminDashboard } from "../../lib/admin/adminService";
import type { AdminDashboard } from "../../types/admin";

type Transacao = AdminDashboard["transacoesRecentes"][number];

const statusVariant: Record<Transacao["status"], "success" | "warning" | "danger"> = {
  Pago: "success",
  Pendente: "warning",
  Estornado: "danger",
};

const transacoesColumns: TableColumn<Transacao>[] = [
  { key: "id", header: "ID do pedido", render: (item) => <span className="text-text-secondary">#{item.id}</span> },
  { key: "loja", header: "Loja", render: (item) => item.loja },
  { key: "cliente", header: "Cliente", render: (item) => item.cliente },
  { key: "valor", header: "Valor", render: (item) => formatCurrency(item.valor) },
  {
    key: "status",
    header: "Status",
    render: (item) => <Badge variant={statusVariant[item.status]}>{item.status}</Badge>,
  },
];

export function AdminDashboardPage() {
  const request = useRequest("admin-dashboard", getAdminDashboard);

  if (!request.data) {
    return (
      <div className="space-y-6">
        <PageHeader title="Visão geral do sistema" description="Indicadores da plataforma Villa Collab." />
        <RequestStatus
          loading={request.loading}
          error={request.error}
          onRetry={request.reload}
          loadingText="Carregando indicadores..."
        />
      </div>
    );
  }

  const dashboard = request.data;
  const maxReceita = Math.max(...dashboard.receitasUltimos7Dias.map((dia) => dia.receita));
  const maxPedidos = Math.max(...dashboard.receitasUltimos7Dias.map((dia) => dia.pedidos));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Visão geral do sistema"
        description="Indicadores da plataforma Villa Collab."
        action={
          <Button variant="outline" disabled title="Geração de relatórios ainda não disponível">
            <Download size={18} />
            Baixar relatório (PDF)
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          title="Volume bruto"
          value={formatCurrency(dashboard.volumeBruto)}
          description="Total transacionado no mês"
          icon={<Wallet size={18} />}
        />
        <StatCard
          title="Pedidos no mês"
          value={dashboard.pedidosMes.toLocaleString("pt-BR")}
          icon={<ShoppingBag size={18} />}
        />
        <StatCard
          title="Lojas ativas"
          value={dashboard.lojasAtivas.toLocaleString("pt-BR")}
          icon={<Store size={18} />}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="p-5 xl:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
            <h2 className="font-semibold text-text">Receitas vs. pedidos (últimos 7 dias)</h2>
            <div className="flex items-center gap-4 text-xs text-text-secondary">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-primary" />
                Receitas
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-gray-300" />
                Pedidos
              </span>
            </div>
          </div>

          <div className="mt-5 flex h-64 items-end gap-3">
            {dashboard.receitasUltimos7Dias.map((dia) => (
              <div key={dia.dia} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                <div className="flex h-full w-full items-end justify-center gap-1">
                  <div
                    className="w-1/2 max-w-6 rounded-t-sm bg-primary"
                    style={{ height: `${(dia.receita / maxReceita) * 100}%` }}
                    title={`${dia.dia}: ${formatCurrency(dia.receita)}`}
                  />
                  <div
                    className="w-1/2 max-w-6 rounded-t-sm bg-gray-300"
                    style={{ height: `${(dia.pedidos / maxPedidos) * 100}%` }}
                    title={`${dia.dia}: ${dia.pedidos} pedidos`}
                  />
                </div>
                <span className="text-xs font-semibold text-text-secondary">{dia.dia}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="border-b border-border pb-3 font-semibold text-text">Top lojas (faturamento)</h2>

          <ul className="divide-y divide-border">
            {dashboard.topLojas.map((loja) => (
              <li key={loja.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-text">{loja.nome}</p>
                  <p className="text-xs text-text-secondary">{loja.pedidos.toLocaleString("pt-BR")} pedidos</p>
                </div>
                <p className="shrink-0 text-sm font-medium text-text">{formatCurrency(loja.faturamento)}</p>
              </li>
            ))}
          </ul>

          <Button variant="outline" className="mt-4 w-full" disabled title="Ranking completo ainda não disponível">
            Ver ranking completo
          </Button>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="p-5 xl:col-span-2">
          <h2 className="pb-3 font-semibold text-text">Transações recentes na plataforma</h2>
          <DataTable data={dashboard.transacoesRecentes} columns={transacoesColumns} />
        </Card>

        <Card className="p-5">
          <h2 className="border-b border-border pb-3 font-semibold text-text">Alertas do sistema</h2>

          {dashboard.alertas.length === 0 ? (
            <p className="pt-4 text-sm text-text-secondary">Nenhum alerta no momento.</p>
          ) : (
            <ul className="space-y-3 pt-4">
              {dashboard.alertas.map((alerta) => (
                <li key={alerta} className="rounded-md bg-background px-3 py-2 text-sm text-text">
                  {alerta}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
