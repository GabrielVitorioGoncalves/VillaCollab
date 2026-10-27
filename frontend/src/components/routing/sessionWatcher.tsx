import { useEffect, useEffectEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { SESSION_EXPIRED_EVENT } from "../../lib/session";

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

  useEffect(() => {
    const handler = () => onExpired();
    window.addEventListener(SESSION_EXPIRED_EVENT, handler);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handler);
  }, []);

  return null;
}
