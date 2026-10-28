import { useOutletContext } from "react-router-dom";

import type { AdminMe, PermissaoAdmin } from "../../types/admin";

export interface AdminContextValue {
  me: AdminMe;
  can: (permissao: PermissaoAdmin) => boolean;
}

export function useAdmin() {
  return useOutletContext<AdminContextValue>();
}

export const adminPagePermission: Record<string, PermissaoAdmin> = {
  "/admin": "relatorios",
  "/admin/lojas": "lojas",
  "/admin/usuarios": "usuarios",
};
