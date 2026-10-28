import { useState } from "react";
import { Download, Store, ShoppingBag, Wallet } from "lucide-react";

import { DataTable, type TableColumn } from "../../components/admin/dataTable";
import { StatCard } from "../../components/admin/statCard";
import { PageHeader } from "../../components/layout/pageHeader";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { RequestStatus } from "../../components/ui/requestStatus";
import { useRequest } from "../../hooks/useRequest";
import { formatCurrency, shortOrderId, toNumber } from "../../lib/format";
import { getAdminDashboard } from "../../lib/admin/adminService";
import { storeStatusLabel } from "../../lib/storeOrderStatus";
import type { PedidoStatus } from "../../types/api";
import type { AdminDashboard } from "../../types/admin";

type Transacao = AdminDashboard["pedidos_recentes"][number];

const statusVariant: Record<PedidoStatus, "default" | "success" | "warning" | "danger"> = {
  pendente: "warning",
  aceito: "default",
  enviado: "default",
  concluido: "success",
  cancelado: "danger",
};

const DIAS = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SAB"];

function diaDaSemana(data: string) {
  return DIAS[new Date(`${data}T12:00:00`).getDay()];
}

function alertasDoPainel(alertas: AdminDashboard["alertas"]): string[] {
  const lista: string[] = [];
  const plural = (n: number, um: string, varios: string) => (n === 1 ? um : varios.replace("{n}", String(n)));
  if (alertas.pedidos_pendentes_atrasados > 0) {
    lista.push(plural(alertas.pedidos_pendentes_atrasados,
      "1 pedido está aguardando a loja há mais de 2 dias.",
      "{n} pedidos estão aguardando a loja há mais de 2 dias."));
  }
  if (alertas.lojas_sem_responsavel > 0) {
    lista.push(plural(alertas.lojas_sem_responsavel,
      "1 loja está sem lojista responsável.",
      "{n} lojas estão sem lojista responsável."));
  }
  if (alertas.lojas_sem_receber_pedidos > 0) {
    lista.push(plural(alertas.lojas_sem_receber_pedidos,
      "1 loja ativa está com o recebimento de pedidos desligado.",
      "{n} lojas ativas estão com o recebimento de pedidos desligado."));
  }
  if (alertas.lojas_desativadas > 0) {
    lista.push(plural(alertas.lojas_desativadas,
      "1 loja está desativada.",
      "{n} lojas estão desativadas."));
  }
  return lista;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);
}

function abrirRelatorio(dashboard: AdminDashboard): boolean {
  const janela = window.open("", "_blank");
  if (!janela) return false;
  const linhas = (itens: string[][]) =>
    itens.map((cols) => `<tr>${cols.map((col) => `<td>${escapeHtml(col)}</td>`).join("")}</tr>`).join("");
  const gerado = new Date().toLocaleString("pt-BR");
  janela.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<title>Relatório Villa Collab</title>
<style>
body{font-family:Arial,sans-serif;color:#111;margin:32px}
h1{font-size:20px;margin:0 0 4px}h2{font-size:15px;margin:28px 0 8px}
p{color:#555;font-size:12px;margin:0}
table{width:100%;border-collapse:collapse;font-size:12px}
th,td{border-bottom:1px solid #ddd;padding:6px 8px;text-align:left}
.resumo td{font-size:14px}
</style></head><body>
<h1>Relatório da plataforma Villa Collab</h1><p>Gerado em ${escapeHtml(gerado)}</p>
<h2>Resumo do mês</h2>
<table class="resumo">${linhas([
    ["Volume bruto", formatCurrency(dashboard.volume_bruto)],
    ["Pedidos no mês", String(dashboard.pedidos_mes)],
    ["Lojas ativas", `${dashboard.lojas_ativas} de ${dashboard.lojas_total}`],
  ])}</table>
<h2>Últimos 7 dias</h2>
<table><tr><th>Dia</th><th>Receita</th><th>Pedidos</th></tr>${linhas(
    dashboard.ultimos_dias.map((dia) => [
      new Date(`${dia.data}T12:00:00`).toLocaleDateString("pt-BR"),
      formatCurrency(dia.receita),
      String(dia.pedidos),
    ]))}</table>
<h2>Faturamento por loja</h2>
<table><tr><th>Loja</th><th>Pedidos</th><th>Faturamento</th></tr>${linhas(
    dashboard.ranking_lojas.map((loja) => [
      loja.ativa ? loja.nome : `${loja.nome} (desativada)`,
      String(loja.pedidos),
      formatCurrency(loja.faturamento),
    ]))}</table>
<h2>Pedidos recentes</h2>
<table><tr><th>Pedido</th><th>Loja</th><th>Cliente</th><th>Valor</th><th>Status</th></tr>${linhas(
    dashboard.pedidos_recentes.map((pedido) => [
      `#${shortOrderId(pedido.id)}`,
      pedido.loja,
      pedido.cliente ?? "-",
      formatCurrency(pedido.valor),
      storeStatusLabel[pedido.status],
    ]))}</table>
<p style="margin-top:24px">Pedidos cancelados não entram no volume, nos pedidos nem no faturamento.</p>
</body></html>`);
  janela.document.close();
  janela.focus();
  janela.print();
  return true;
}

const transacoesColumns: TableColumn<Transacao>[] = [
  { key: "id", header: "ID do pedido", render: (item) => <span className="text-text-secondary">#{shortOrderId(item.id)}</span> },
  { key: "loja", header: "Loja", render: (item) => item.loja },
  { key: "cliente", header: "Cliente", render: (item) => item.cliente ?? "-" },
  { key: "valor", header: "Valor", render: (item) => formatCurrency(item.valor) },
  {
    key: "status",
    header: "Status",
    render: (item) => <Badge variant={statusVariant[item.status]}>{storeStatusLabel[item.status]}</Badge>,
  },
];

export function AdminDashboardPage() {
  const request = useRequest("admin-dashboard", getAdminDashboard);
  const [rankingCompleto, setRankingCompleto] = useState(false);
  const [aviso, setAviso] = useState("");

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
  const dias = dashboard.ultimos_dias.map((dia) => ({
    dia: diaDaSemana(dia.data),
    data: dia.data,
    receita: toNumber(dia.receita),
    pedidos: dia.pedidos,
  }));
  const maxReceita = Math.max(1, ...dias.map((dia) => dia.receita));
  const maxPedidos = Math.max(1, ...dias.map((dia) => dia.pedidos));
  const ranking = rankingCompleto ? dashboard.ranking_lojas : dashboard.ranking_lojas.slice(0, 3);
  const alertas = alertasDoPainel(dashboard.alertas);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Visão geral do sistema"
        description="Indicadores da plataforma Villa Collab."
        action={
          <Button
            variant="outline"
            onClick={() =>
              setAviso(
                abrirRelatorio(dashboard)
                  ? ""
                  : "O navegador bloqueou a janela do relatório. Libere pop-ups para este site e tente de novo."
              )
            }
            title="Abre o relatório para imprimir ou salvar em PDF"
          >
            <Download size={18} />
            Baixar relatório (PDF)
          </Button>
        }
      />

      {aviso && (
        <p role="alert" className="rounded-md border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
          {aviso}
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          title="Volume bruto"
          value={formatCurrency(dashboard.volume_bruto)}
          description="Total transacionado no mês, sem cancelados"
          icon={<Wallet size={18} />}
        />
        <StatCard
          title="Pedidos no mês"
          value={dashboard.pedidos_mes.toLocaleString("pt-BR")}
          description="Sem pedidos cancelados"
          icon={<ShoppingBag size={18} />}
        />
        <StatCard
          title="Lojas ativas"
          value={dashboard.lojas_ativas.toLocaleString("pt-BR")}
          description={`De ${dashboard.lojas_total.toLocaleString("pt-BR")} cadastradas`}
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
            {dias.map((dia) => (
              <div key={dia.data} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
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
            {ranking.length === 0 && (
              <li className="py-3 text-sm text-text-secondary">Nenhuma loja cadastrada.</li>
            )}
            {ranking.map((loja) => (
              <li key={loja.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-text">{loja.nome}</p>
                  <p className="text-xs text-text-secondary">
                    {loja.pedidos.toLocaleString("pt-BR")} {loja.pedidos === 1 ? "pedido" : "pedidos"}
                    {loja.ativa ? "" : " · desativada"}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-medium text-text">{formatCurrency(loja.faturamento)}</p>
              </li>
            ))}
          </ul>

          {dashboard.ranking_lojas.length > 3 && (
            <Button variant="outline" className="mt-4 w-full" onClick={() => setRankingCompleto((atual) => !atual)}>
              {rankingCompleto ? "Mostrar só o top 3" : "Ver ranking completo"}
            </Button>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="p-5 xl:col-span-2">
          <h2 className="pb-3 font-semibold text-text">Transações recentes na plataforma</h2>
          <DataTable
            data={dashboard.pedidos_recentes}
            columns={transacoesColumns}
            emptyMessage="Nenhum pedido feito ainda."
          />
        </Card>

        <Card className="p-5">
          <h2 className="border-b border-border pb-3 font-semibold text-text">Alertas do sistema</h2>

          {alertas.length === 0 ? (
            <p className="pt-4 text-sm text-text-secondary">Nenhum alerta no momento.</p>
          ) : (
            <ul className="space-y-3 pt-4">
              {alertas.map((alerta) => (
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
