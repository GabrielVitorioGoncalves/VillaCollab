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
import { formatDateTime } from "../../lib/format";
import { listAdminUsers } from "../../lib/admin/adminService";
import type { AdminUser, PapelUsuario } from "../../types/admin";

const PAPEIS: PapelUsuario[] = ["Cliente final", "Dono de loja", "Administrador"];

export function AdminUsersPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const notice = (location.state as { notice?: string } | null)?.notice;
  const request = useRequest("admin-usuarios", listAdminUsers);

  const [search, setSearch] = useState("");
  const [papelFilter, setPapelFilter] = useState<PapelUsuario | "todos">("todos");
  const [editTarget, setEditTarget] = useState<AdminUser | null>(null);
  const [editPapel, setEditPapel] = useState<PapelUsuario>("Cliente final");
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [localNotice, setLocalNotice] = useState("");

  const filteredUsers = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return (request.data ?? []).filter((user) => {
      const matchesSearch =
        user.nome.toLowerCase().includes(normalizedSearch) ||
        user.email.toLowerCase().includes(normalizedSearch);
      const matchesPapel = papelFilter === "todos" || user.papel === papelFilter;

      return matchesSearch && matchesPapel;
    });
  }, [request.data, search, papelFilter]);

  if (!request.data) {
    return (
      <div className="space-y-6">
        <PageHeader title="Controle de usuários" description="Gerencie os usuários e seus papéis na plataforma." />
        <RequestStatus
          loading={request.loading}
          error={request.error}
          onRetry={request.reload}
          loadingText="Carregando usuários..."
        />
      </div>
    );
  }

  function openEdit(user: AdminUser) {
    setEditTarget(user);
    setEditPapel(user.papel);
  }

  function saveRole() {
    if (!editTarget || !request.data) return;

    const updated = editTarget;
    request.mutate(
      request.data.map((user) => (user.id === updated.id ? { ...user, papel: editPapel } : user))
    );
    setEditTarget(null);
    setLocalNotice(`Papel de "${updated.nome}" alterado apenas na tela. Nada foi salvo no servidor.`);
  }

  function confirmDelete() {
    if (!deleteTarget || !request.data) return;

    const removed = deleteTarget;
    request.mutate(request.data.filter((user) => user.id !== removed.id));
    setDeleteTarget(null);
    setLocalNotice(`Exclusão de "${removed.nome}" feita apenas na tela. Nada foi removido do servidor.`);
  }

  const columns: TableColumn<AdminUser>[] = [
    {
      key: "usuario",
      header: "Usuário / e-mail",
      render: (user) => (
        <div>
          <p className="font-semibold">{user.nome}</p>
          <p className="text-xs text-text-secondary">{user.email}</p>
        </div>
      ),
    },
    {
      key: "papel",
      header: "Papel (RBAC)",
      render: (user) => <span className="text-text-secondary">{user.papel}</span>,
    },
    {
      key: "seguranca",
      header: "Segurança",
      render: (user) =>
        user.mfa ? <Badge>MFA ativo</Badge> : <Badge variant="warning">MFA inativo</Badge>,
    },
    {
      key: "ultimoLogin",
      header: "Último login",
      render: (user) => formatDateTime(user.ultimoLogin),
    },
    {
      key: "acoes",
      header: "Ações",
      render: (user) => <TableActions onEdit={() => openEdit(user)} onDelete={() => setDeleteTarget(user)} />,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Controle de usuários"
        description="Gerencie os usuários e seus papéis na plataforma."
        action={
          <Button onClick={() => navigate("/admin/administradores/novo")}>
            <Plus size={18} />
            Cadastrar ADM
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
              placeholder="Buscar por nome ou e-mail..."
              className="pl-10"
              aria-label="Buscar usuários"
            />
          </div>

          <select
            value={papelFilter}
            onChange={(event) => setPapelFilter(event.target.value as PapelUsuario | "todos")}
            aria-label="Filtrar por papel"
            className="rounded-md border border-border bg-white px-3 py-2 text-sm text-text outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          >
            <option value="todos">Todos os papéis</option>
            {PAPEIS.map((papel) => (
              <option key={papel} value={papel}>
                {papel}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-5">
          <DataTable
            data={filteredUsers}
            columns={columns}
            emptyMessage="Nenhum usuário encontrado com esses filtros."
          />
        </div>
      </Card>

      {editTarget && (
        <Modal
          title="Alterar papel"
          description={`Defina o papel de acesso (RBAC) de ${editTarget.nome}.`}
          onClose={() => setEditTarget(null)}
          footer={
            <>
              <Button variant="outline" onClick={() => setEditTarget(null)}>
                Cancelar
              </Button>
              <Button onClick={saveRole}>Salvar papel</Button>
            </>
          }
        >
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-text">Papel</span>
            <select
              value={editPapel}
              onChange={(event) => setEditPapel(event.target.value as PapelUsuario)}
              className="rounded-md border border-border bg-white px-3 py-2 text-sm text-text outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            >
              {PAPEIS.map((papel) => (
                <option key={papel} value={papel}>
                  {papel}
                </option>
              ))}
            </select>
          </label>
        </Modal>
      )}

      {deleteTarget && (
        <Modal
          title="Excluir usuário?"
          description={`O acesso de ${deleteTarget.nome} (${deleteTarget.email}) será removido da plataforma.`}
          onClose={() => setDeleteTarget(null)}
          footer={
            <>
              <Button variant="outline" onClick={() => setDeleteTarget(null)}>
                Cancelar
              </Button>
              <Button variant="danger" onClick={confirmDelete}>
                Excluir usuário
              </Button>
            </>
          }
        />
      )}
    </div>
  );
}
