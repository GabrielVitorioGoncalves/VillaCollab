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
import { ApiError, errorMessage } from "../../lib/api";
import { deleteAdminStore, listAdminStores, updateAdminStore } from "../../lib/admin/adminService";
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

function statusOf(store: AdminStore): AdminStoreStatus {
  return store.ativa ? "ativo" : "inativo";
}

export function AdminStoresPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const notice = (location.state as { notice?: string } | null)?.notice;
  const request = useRequest("admin-lojas", listAdminStores);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("todos");
  const [deleteTarget, setDeleteTarget] = useState<AdminStore | null>(null);
  const [localNotice, setLocalNotice] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deleteBlocked, setDeleteBlocked] = useState(false);
  const [saving, setSaving] = useState(false);

  const filteredStores = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return (request.data ?? []).filter((store) => {
      const matchesSearch =
        store.nome.toLowerCase().includes(normalizedSearch) ||
        (store.responsavel_email ?? "").toLowerCase().includes(normalizedSearch) ||
        store.slug.toLowerCase().includes(normalizedSearch) ||
        (store.cnpj ?? "").toLowerCase().includes(normalizedSearch.replace(/[^0-9a-z]/g, ""));
      const matchesStatus = statusFilter === "todos" || statusOf(store) === statusFilter;

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

  function closeDelete() {
    setDeleteTarget(null);
    setDeleteError("");
    setDeleteBlocked(false);
  }

  async function confirmDelete() {
    if (!deleteTarget || !request.data || saving) return;
    const removed = deleteTarget;
    setSaving(true);
    setDeleteError("");
    try {
      await deleteAdminStore(removed.id);
      request.mutate(request.data.filter((store) => store.id !== removed.id));
      closeDelete();
      setLocalNotice(`A loja "${removed.nome}" foi excluída.`);
    } catch (caught) {
      setDeleteBlocked(caught instanceof ApiError && caught.status === 409);
      setDeleteError(errorMessage(caught));
    } finally {
      setSaving(false);
    }
  }

  async function deactivateTarget() {
    if (!deleteTarget || !request.data || saving) return;
    const target = deleteTarget;
    setSaving(true);
    try {
      const updated = await updateAdminStore(target.id, { ativa: false });
      request.mutate(request.data.map((store) => (store.id === target.id ? updated : store)));
      closeDelete();
      setLocalNotice(`A loja "${target.nome}" foi desativada e saiu do marketplace.`);
    } catch (caught) {
      setDeleteError(errorMessage(caught));
    } finally {
      setSaving(false);
    }
  }

  const columns: TableColumn<AdminStore>[] = [
    {
      key: "tenant",
      header: "ID (tenant)",
      render: (store) => <span className="text-text-secondary">{store.slug}</span>,
    },
    {
      key: "nome",
      header: "Nome da loja",
      render: (store) => (
        <div>
          <p className="font-semibold">{store.nome}</p>
          <p className="text-xs text-text-secondary">
            {store.total_produtos} {store.total_produtos === 1 ? "produto" : "produtos"} · {store.total_pedidos}{" "}
            {store.total_pedidos === 1 ? "pedido" : "pedidos"}
          </p>
        </div>
      ),
    },
    {
      key: "responsavel",
      header: "Responsável",
      render: (store) => (
        <span className="text-text-secondary">{store.responsavel_email ?? "Sem responsável"}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (store) => <Badge variant={statusVariant[statusOf(store)]}>{statusLabel[statusOf(store)]}</Badge>,
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
        <p role="status" className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
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
              placeholder="Buscar por nome, responsável, ID ou CNPJ..."
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
          description={`A loja "${deleteTarget.nome}" e os produtos dela serão removidos. O lojista responsável volta a ser cliente.`}
          onClose={closeDelete}
          footer={
            <>
              <Button variant="outline" onClick={closeDelete} disabled={saving}>
                Cancelar
              </Button>
              {deleteBlocked ? (
                deleteTarget.ativa && (
                  <Button onClick={deactivateTarget} disabled={saving}>
                    Desativar loja
                  </Button>
                )
              ) : (
                <Button variant="danger" onClick={confirmDelete} disabled={saving}>
                  {saving ? "Excluindo..." : "Excluir loja"}
                </Button>
              )}
            </>
          }
        >
          {deleteError && (
            <p role="alert" className="text-sm text-danger">
              {deleteError}
            </p>
          )}
        </Modal>
      )}
    </div>
  );
}
