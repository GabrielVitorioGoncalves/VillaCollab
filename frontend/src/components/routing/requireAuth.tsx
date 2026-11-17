import { Navigate, Outlet, useLocation } from "react-router-dom";

import { getToken, proximaEtapaDeSeguranca } from "../../lib/session";

export function RequireAuth() {
  const location = useLocation();

  if (!getToken()) {
    return (
      <Navigate
        to="/"
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  }

  const etapa = proximaEtapaDeSeguranca();
  if (etapa) return <Navigate to={etapa} replace />;

  return <Outlet />;
}
