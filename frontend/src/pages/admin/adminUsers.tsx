import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Plus, Search } from "lucide-react";

import { AdminAccessFields } from "../../components/admin/adminAccessFields";
import { DataTable, type TableColumn } from "../../components/admin/dataTable";
import { Modal } from "../../components/admin/modal";
import { TableActions } from "../../components/admin/tabelActions";
import { useAdmin } from "../../components/layout/adminContext";
import { PageHeader } from "../../components/layout/pageHeader";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { RequestStatus } from "../../components/ui/requestStatus";
import { useRequest } from "../../hooks/useRequest";
import { errorMessage } from "../../lib/api";
import { formatDateTime } from "../../lib/format";
import { deleteAdminUser, listAdminUsers, updateAdminUserRole } from "../../lib/admin/adminService";
import { listStores } from "../../lib/services";
import type { UserRole } from "../../types/api";
import type { AdminRoleInput, AdminUser, PapelUsuario, PermissaoAdmin, TipoAdministrador } from "../../types/admin";

const PAPEIS: PapelUsuario[] = ["Cliente final", "Dono de loja", "Administrador"];

const papelDoRole: Record<UserRole, PapelUsuario> = {
  cliente: "Cliente final",
  lojista: "Dono de loja",
  admin: "Administrador",
};

const permissaoLabel: Record<PermissaoAdmin, string> = {
  lojas: "lojas",
  produtos: "produtos",
  usuarios: "usuários",
  relatorios: "relatórios",
};

export function AdminUsersPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const notice = (location.state as { notice?: string } | null)?.notice;
  const { me } = useAdmin();
  const request = useRequest("admin-usuarios", listAdminUsers);
  const stores = useRequest("lojas-publicas", listStores);

  const [search, setSearch] = useState("");
  const [papelFilter, setPapelFilter] = useState<PapelUsuario | "todos">("todos");
  const [editTarget, setEditTarget] = useState<AdminUser | null>(null);
  const [editPapel, setEditPapel] = useState<PapelUsuario>("Cliente final");
  const [editLoja, setEditLoja] = useState("");
  const [editTipo, setEditTipo] = useState<TipoAdministrador>("Suporte");
  const [editPermissoes, setEditPermissoes] = useState<PermissaoAdmin[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [localNotice, setLocalNotice] = useState("");
  const [modalError, setModalError] = useState("");
  const [saving, setSaving] = useState(false);

  const filteredUsers = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return (request.data ?? []).filter((user) => {
      const matchesSearch =
        user.nome.toLowerCase().includes(normalizedSearch) ||
        (user.email ?? "").toLowerCase().includes(normalizedSearch) ||
        (user.loja_nome ?? "").toLowerCase().includes(normalizedSearch);
      const matchesPapel = papelFilter === "todos" || papelDoRole[user.role] === papelFilter;

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

  const lojaOptions = [
    ...(stores.data ?? []).map((loja) => ({ id: loja.id, nome: loja.nome })),
    ...(editTarget?.loja_id && !(stores.data ?? []).some((loja) => loja.id === editTarget.loja_id)
      ? [{ id: editTarget.loja_id, nome: `${editTarget.loja_nome ?? "Loja atual"} (desativada)` }]
      : []),
  ];

  function openEdit(user: AdminUser) {
    setEditTarget(user);
    setEditPapel(papelDoRole[user.role]);
    setEditLoja(user.loja_id ?? "");
    setEditTipo(user.admin_tipo ?? (me.permissoes.length === 4 ? "Admin" : "Suporte"));
    setEditPermissoes(user.admin_permissoes ?? []);
    setModalError("");
  }

  function closeModals() {
    setEditTarget(null);
    setDeleteTarget(null);
    setModalError("");
  }

  function replaceUser(updated: AdminUser) {
    if (!request.data) return;
    request.mutate(request.data.map((user) => (user.id === updated.id ? { ...updated, voce: user.voce } : user)));
  }

  async function saveRole() {
    if (!editTarget || saving) return;

    let input: AdminRoleInput;
    if (editPapel === "Dono de loja") {
      if (!editLoja) return setModalError("Escolha a loja deste lojista.");
      input = { role: "lojista", loja_id: editLoja };
    } else if (editPapel === "Administrador") {
      if (editTipo !== "Admin" && editPermissoes.length === 0) return setModalError("Escolha pelo menos uma permissão.");
      input = { role: "admin", admin_tipo: editTipo, ...(editTipo === "Admin" ? {} : { admin_permissoes: editPermissoes }) };
    } else {
      input = { role: "cliente" };
    }

    const target = editTarget;
    setSaving(true);
    setModalError("");
    try {
      replaceUser(await updateAdminUserRole(target.id, input));
      closeModals();
      setLocalNotice(`Papel de "${target.nome}" alterado para ${editPapel}.`);
    } catch (caught) {
      setModalError(errorMessage(caught));
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget || !request.data || saving) return;

    const removed = deleteTarget;
    setSaving(true);
    setModalError("");
    try {
      await deleteAdminUser(removed.id);
      request.mutate(request.data.filter((user) => user.id !== removed.id));
      closeModals();
      setLocalNotice(`A conta de "${removed.nome}" foi excluída.`);
    } catch (caught) {
      setModalError(errorMessage(caught));
    } finally {
      setSaving(false);
    }
  }

  const columns: TableColumn<AdminUser>[] = [
    {
      key: "usuario",
      header: "Usuário / e-mail",
      render: (user) => (
        <div>
          <p className="font-semibold">
            {user.nome}
            {user.voce && <span className="ml-1 text-xs font-normal text-text-secondary">(você)</span>}
          </p>
          <p className="text-xs text-text-secondary">{user.email ?? "Sem e-mail"}</p>
        </div>
      ),
    },
    {
      key: "papel",
      header: "Papel (RBAC)",
      render: (user) => (
        <div className="text-text-secondary">
          <p>{papelDoRole[user.role]}</p>
          {user.role === "lojista" && <p className="text-xs">{user.loja_nome ?? "Sem loja"}</p>}
          {user.role === "admin" && (
            <p className="text-xs">
              {user.admin_tipo ?? "Admin"}
              {user.admin_permissoes && user.admin_permissoes.length < 4
                ? `: ${user.admin_permissoes.map((permissao) => permissaoLabel[permissao]).join(", ")}`
                : ""}
            </p>
          )}
        </div>
      ),
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
      render: (user) => (user.ultimo_login ? formatDateTime(user.ultimo_login) : "Nunca entrou"),
    },
    {
      key: "acoes",
      header: "Ações",
      render: (user) =>
        user.voce ? (
          <span className="text-xs text-text-secondary">Sua conta</span>
        ) : (
          <TableActions
            onEdit={() => openEdit(user)}
            onDelete={() => {
              setModalError("");
              setDeleteTarget(user);
            }}
          />
        ),
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
              placeholder="Buscar por nome, e-mail ou loja..."
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
          onClose={closeModals}
          footer={
            <>
              <Button variant="outline" onClick={closeModals} disabled={saving}>
                Cancelar
              </Button>
              <Button onClick={saveRole} disabled={saving}>
                {saving ? "Salvando..." : "Salvar papel"}
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-text">Papel</span>
              <select
                value={editPapel}
                onChange={(event) => {
                  setEditPapel(event.target.value as PapelUsuario);
                  setModalError("");
                }}
                className="rounded-md border border-border bg-white px-3 py-2 text-sm text-text outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              >
                {PAPEIS.map((papel) => (
                  <option key={papel} value={papel}>
                    {papel}
                  </option>
                ))}
              </select>
            </label>

            {editPapel === "Dono de loja" && (
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-text">Loja</span>
                <select
                  value={editLoja}
                  onChange={(event) => {
                    setEditLoja(event.target.value);
                    setModalError("");
                  }}
                  className="rounded-md border border-border bg-white px-3 py-2 text-sm text-text outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                >
                  <option value="">Selecione a loja</option>
                  {lojaOptions.map((loja) => (
                    <option key={loja.id} value={loja.id}>
                      {loja.nome}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {editPapel === "Administrador" && (
              <AdminAccessFields
                tipo={editTipo}
                permissoes={editPermissoes}
                disponiveis={me.permissoes}
                onTipoChange={setEditTipo}
                onPermissoesChange={setEditPermissoes}
              />
            )}

            {modalError && (
              <p role="alert" className="text-sm text-danger">
                {modalError}
              </p>
            )}
          </div>
        </Modal>
      )}

      {deleteTarget && (
        <Modal
          title="Excluir usuário?"
          description={`A conta de ${deleteTarget.nome} (${deleteTarget.email ?? "sem e-mail"}) será apagada e não poderá mais entrar na plataforma.`}
          onClose={closeModals}
          footer={
            <>
              <Button variant="outline" onClick={closeModals} disabled={saving}>
                Cancelar
              </Button>
              <Button variant="danger" onClick={confirmDelete} disabled={saving}>
                {saving ? "Excluindo..." : "Excluir usuário"}
              </Button>
            </>
          }
        >
          {modalError && (
            <p role="alert" className="text-sm text-danger">
              {modalError}
            </p>
          )}
        </Modal>
      )}
    </div>
  );
}
