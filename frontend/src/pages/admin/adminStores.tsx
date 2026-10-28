import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Plus, Search } from "lucide-react";

import { DataTable, type TableColumn } from "../../components/admin/dataTable";
import { Modal } from "../../components/admin/modal";
import { TableActions } from "../../components/admin/tabelActions";
import { PageHeader } from "../../components/layout/pageHeader";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { RequestStatus } from "../../components/ui/requestStatus";
import { useRequest } from "../../hooks/useRequest";
import { listAdminStores } from "../../lib/admin/adminService";
import type { AdminStore, AdminStoreStatus } from "../../types/admin";

type StatusFilter = "todos" | AdminStoreStatus;

const statusLabel: Record<AdminStoreStatus, string> = {
  ativo: "Ativo",
  inativo: "Inativo",
};

const statusVariant: Record<AdminStoreStatus, "success" | "default"> = {
  ativo: "success",
  inativo: "default",
};

export function AdminStoresPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const notice = (location.state as { notice?: string } | null)?.notice;
  const request = useRequest("admin-lojas", listAdminStores);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("todos");
  const [deleteTarget, setDeleteTarget] = useState<AdminStore | null>(null);
  const [localNotice, setLocalNotice] = useState("");

  const filteredStores = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return (request.data ?? []).filter((store) => {
      const matchesSearch =
        store.nome.toLowerCase().includes(normalizedSearch) ||
        store.responsavel.toLowerCase().includes(normalizedSearch) ||
        store.tenant.toLowerCase().includes(normalizedSearch);
      const matchesStatus = statusFilter === "todos" || store.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [request.data, search, statusFilter]);

  if (!request.data) {
    return (
      <div className="space-y-6">
        <PageHeader title="Lojas cadastradas" description="Gerencie as lojas da plataforma." />
        <RequestStatus
          loading={request.loading}
          error={request.error}
          onRetry={request.reload}
          loadingText="Carregando lojas..."
        />
      </div>
    );
  }

  function confirmDelete() {
    if (!deleteTarget || !request.data) return;

    const removed = deleteTarget;
    request.mutate(request.data.filter((store) => store.id !== removed.id));
    setDeleteTarget(null);
    setLocalNotice(`Exclusão de "${removed.nome}" feita apenas na tela. Nada foi removido do servidor.`);
  }

  const columns: TableColumn<AdminStore>[] = [
    {
      key: "tenant",
      header: "ID (tenant)",
      render: (store) => <span className="text-text-secondary">{store.tenant}</span>,
    },
    {
      key: "nome",
      header: "Nome da loja",
      render: (store) => <span className="font-semibold">{store.nome}</span>,
    },
    {
      key: "responsavel",
      header: "Responsável",
      render: (store) => <span className="text-text-secondary">{store.responsavel}</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (store) => <Badge variant={statusVariant[store.status]}>{statusLabel[store.status]}</Badge>,
    },
    {
      key: "acoes",
      header: "Ações",
      render: (store) => (
        <TableActions
          onEdit={() => navigate(`/admin/lojas/${store.id}/editar`)}
          onDelete={() => setDeleteTarget(store)}
        />
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Lojas cadastradas"
        description="Gerencie as lojas da plataforma."
        action={
          <Button onClick={() => navigate("/admin/lojas/nova")}>
            <Plus size={18} />
            Nova loja
          </Button>
        }
      />

      {notice && (
        <p role="status" className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {notice}
        </p>
      )}

      {localNotice && (
        <p role="status" className="rounded-md border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
          {localNotice}
        </p>
      )}

      <Card className="p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-sm">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por nome, responsável ou ID..."
              className="pl-10"
              aria-label="Buscar lojas"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
            aria-label="Filtrar por status"
            className="rounded-md border border-border bg-white px-3 py-2 text-sm text-text outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          >
            <option value="todos">Todos os status</option>
            <option value="ativo">Ativas</option>
            <option value="inativo">Inativas</option>
          </select>
        </div>

        <div className="mt-5">
          <DataTable
            data={filteredStores}
            columns={columns}
            emptyMessage="Nenhuma loja encontrada com esses filtros."
          />
        </div>
      </Card>

      {deleteTarget && (
        <Modal
          title="Excluir loja?"
          description={`A loja "${deleteTarget.nome}" e seus dados deixarão de aparecer na plataforma.`}
          onClose={() => setDeleteTarget(null)}
          footer={
            <>
              <Button variant="outline" onClick={() => setDeleteTarget(null)}>
                Cancelar
              </Button>
              <Button variant="danger" onClick={confirmDelete}>
                Excluir loja
              </Button>
            </>
          }
        />
      )}
    </div>
  );
}
