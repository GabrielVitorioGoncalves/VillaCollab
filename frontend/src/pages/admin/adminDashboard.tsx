import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { TriangleAlert, Clock, Download, Store, Users } from "lucide-react";

import { useAdmin } from "../../components/layout/adminContext";
import { StatCard } from "../../components/admin/statCard";
import { PageHeader } from "../../components/layout/pageHeader";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { RequestStatus } from "../../components/ui/requestStatus";
import { useRequest } from "../../hooks/useRequest";
import { formatDate, formatShortDate } from "../../lib/format";
import { getAdminDashboard } from "../../lib/admin/adminService";
import type { AdminDashboard, MotivoAtencao } from "../../types/admin";

type LojaAtencao = AdminDashboard["atencao"][number];

const variantePorMotivo: Record<MotivoAtencao, "default" | "warning" | "danger"> = {
  pedidos_atrasados: "warning",
  sem_responsavel: "warning",
  sem_receber_pedidos: "default",
  sem_produtos: "default",
  desativada: "danger",
};

function plural(n: number, um: string, varios: string) {
  return n === 1 ? um : varios.replace("{n}", n.toLocaleString("pt-BR"));
}

function textoDoMotivo(motivo: MotivoAtencao, loja: LojaAtencao): string {
  switch (motivo) {
    case "pedidos_atrasados":
      return plural(loja.pedidos_atrasados,
        "1 pedido esperando a loja há mais de 2 dias",
        "{n} pedidos esperando a loja há mais de 2 dias");
    case "sem_responsavel":
      return "Sem lojista responsável";
    case "sem_receber_pedidos":
      return "Recebimento de pedidos desligado";
    case "sem_produtos":
      return "Nenhum produto à venda";
    case "desativada":
      return "Loja desativada";
  }
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
  const { lojas, usuarios, pedidos } = dashboard;
  janela.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<title>Relatório Villa Collab</title>
<style>
body{font-family:Arial,sans-serif;color:#111;margin:32px}
h1{font-size:20px;margin:0 0 4px}h2{font-size:15px;margin:28px 0 8px}
p{color:#555;font-size:12px;margin:0}
table{width:100%;border-collapse:collapse;font-size:12px}
th,td{border-bottom:1px solid #ddd;padding:6px 8px;text-align:left}
.resumo td{font-size:14px}
.resumo td:last-child{text-align:right;width:140px}
</style></head><body>
<h1>Relatório da plataforma Villa Collab</h1><p>Gerado em ${escapeHtml(gerado)}</p>
<h2>Lojas</h2>
<table class="resumo">${linhas([
    ["Lojas ativas", `${lojas.ativas} de ${lojas.total}`],
    ["Lojas desativadas", String(lojas.desativadas)],
    ["Lojas sem lojista responsável", String(lojas.sem_responsavel)],
    ["Lojas com o recebimento de pedidos desligado", String(lojas.sem_receber_pedidos)],
  ])}</table>
<h2>Contas</h2>
<table class="resumo">${linhas([
    ["Clientes", String(usuarios.clientes)],
    ["Donos de loja", String(usuarios.lojistas)],
    ["Administradores", String(usuarios.administradores)],
  ])}</table>
<h2>Pedidos em aberto</h2>
<table class="resumo">${linhas([
    ["Esperando a confirmação da loja", String(pedidos.aguardando_loja)],
    ["Dos quais há mais de 2 dias", String(pedidos.atrasados)],
    ["Confirmados ou a caminho", String(pedidos.em_andamento)],
  ])}</table>
<h2>Lojas que precisam de atenção</h2>
${dashboard.atencao.length === 0
    ? "<p>Nenhuma loja precisa de atenção no momento.</p>"
    : `<table><tr><th>Loja</th><th>Situação</th></tr>${linhas(
      dashboard.atencao.map((loja) => [loja.nome, loja.motivos.map((m) => textoDoMotivo(m, loja)).join("; ")]))}</table>`}
<h2>Lojas cadastradas recentemente</h2>
<table><tr><th>Loja</th><th>Responsável</th><th>Cadastro</th><th>Situação</th></tr>${linhas(
    dashboard.lojas_recentes.map((loja) => [
      loja.nome,
      loja.responsavel ?? "Sem responsável",
      formatDate(loja.created_at),
      loja.ativa ? "Ativa" : "Desativada",
    ]))}</table>
</body></html>`);
  janela.document.close();
  janela.focus();
  janela.print();
  return true;
}

export function AdminDashboardPage() {
  const request = useRequest("admin-dashboard", getAdminDashboard);
  const { can } = useAdmin();
  const navigate = useNavigate();
  const [aviso, setAviso] = useState("");

  if (!request.data) {
    return (
      <div className="space-y-6">
        <PageHeader title="Visão geral do sistema" description="Situação das lojas e das contas da plataforma." />
        <RequestStatus
          loading={request.loading}
          error={request.error}
          onRetry={request.reload}
          loadingText="Carregando o painel..."
        />
      </div>
    );
  }

  const dashboard = request.data;
  const { lojas, usuarios, pedidos } = dashboard;
  const podeEditarLojas = can("lojas");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Visão geral do sistema"
        description="Situação das lojas e das contas da plataforma."
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Lojas ativas"
          value={lojas.ativas.toLocaleString("pt-BR")}
          description={`De ${lojas.total.toLocaleString("pt-BR")} cadastradas`}
          icon={<Store size={18} />}
        />
        <StatCard
          title="Clientes"
          value={usuarios.clientes.toLocaleString("pt-BR")}
          description={`${plural(usuarios.lojistas, "1 dono de loja", "{n} donos de loja")} · ${plural(usuarios.administradores, "1 administrador", "{n} administradores")}`}
          icon={<Users size={18} />}
        />
        <StatCard
          title="Pedidos esperando as lojas"
          value={pedidos.aguardando_loja.toLocaleString("pt-BR")}
          description={pedidos.atrasados > 0
            ? plural(pedidos.atrasados, "1 há mais de 2 dias", "{n} há mais de 2 dias")
            : "Nenhum esperando há mais de 2 dias"}
          icon={<Clock size={18} />}
        />
        <StatCard
          title="Lojas que precisam de atenção"
          value={dashboard.atencao.length.toLocaleString("pt-BR")}
          description={dashboard.atencao.length > 0 ? "Veja a lista abaixo" : "Tudo em ordem"}
          icon={<TriangleAlert size={18} />}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="p-5 xl:col-span-2">
          <h2 className="pb-1 font-semibold text-text">Lojas que precisam de atenção</h2>
          <p className="pb-4 text-sm text-text-secondary">
            Pedidos parados, loja sem responsável, sem produtos à venda ou fora do ar.
          </p>
          {dashboard.atencao.length === 0 ? (
            <p className="rounded-md border border-border px-4 py-6 text-center text-sm text-text-secondary">
              Nenhuma loja precisa de atenção no momento.
            </p>
          ) : (
            <ul className="divide-y divide-border rounded-md border border-border">
              {dashboard.atencao.map((loja) => (
                <li key={loja.id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 space-y-1.5">
                    <p className="text-sm font-semibold text-text">{loja.nome}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {loja.motivos.map((motivo) => (
                        <Badge key={motivo} variant={variantePorMotivo[motivo]}>
                          {textoDoMotivo(motivo, loja)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  {podeEditarLojas && (
                    <Button
                      variant="outline"
                      className="shrink-0 self-start whitespace-nowrap sm:self-center"
                      onClick={() => navigate(`/admin/lojas/${loja.id}/editar`)}
                    >
                      Abrir loja
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="border-b border-border pb-3 font-semibold text-text">Lojas cadastradas recentemente</h2>

          {dashboard.lojas_recentes.length === 0 ? (
            <p className="pt-4 text-sm text-text-secondary">Nenhuma loja cadastrada ainda.</p>
          ) : (
            <ul className="divide-y divide-border">
              {dashboard.lojas_recentes.map((loja) => (
                <li key={loja.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-text">{loja.nome}</p>
                    <p className="truncate text-xs text-text-secondary">{loja.responsavel ?? "Sem responsável"}</p>
                    <p className="text-xs text-text-secondary">Cadastrada em {formatShortDate(loja.created_at)}</p>
                  </div>
                  <Badge variant={loja.ativa ? "success" : "danger"}>{loja.ativa ? "Ativa" : "Desativada"}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
