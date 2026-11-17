import { useEffect, useEffectEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { getSession, SECURITY_REQUIRED_EVENT, SESSION_EXPIRED_EVENT, updateSessionUser } from "../../lib/session";

export function SessionWatcher() {
  const navigate = useNavigate();
  const location = useLocation();

  const onExpired = useEffectEvent(() => {
    if (location.pathname === "/") return;
    navigate("/", {
      replace: true,
      state: { from: location.pathname + location.search, expired: true },
    });
  });

  const onSecurityRequired = useEffectEvent((codigo: string) => {
    const usuario = getSession()?.usuario;
    if (codigo === "troca_de_senha") {
      if (usuario && !usuario.trocar_senha) updateSessionUser({ ...usuario, trocar_senha: true });
      if (location.pathname !== "/conta/nova-senha") navigate("/conta/nova-senha", { replace: true });
      return;
    }
    if (location.pathname !== "/conta/verificacao") navigate("/conta/verificacao", { replace: true });
  });

  useEffect(() => {
    const handler = () => onExpired();
    const securityHandler = (event: Event) => onSecurityRequired(String((event as CustomEvent).detail ?? ""));
    window.addEventListener(SESSION_EXPIRED_EVENT, handler);
    window.addEventListener(SECURITY_REQUIRED_EVENT, securityHandler);
    return () => {
      window.removeEventListener(SESSION_EXPIRED_EVENT, handler);
      window.removeEventListener(SECURITY_REQUIRED_EVENT, securityHandler);
    };
  }, []);

  return null;
}
