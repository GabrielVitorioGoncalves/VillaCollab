import { Navigate, Outlet, useLocation } from "react-router-dom";

import { getToken } from "../../lib/session";

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

  return <Outlet />;
}
