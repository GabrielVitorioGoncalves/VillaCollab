import type { Usuario } from "../types/api";

const TOKEN_KEY = "villacollab_token";
const NAME_KEY = "villacollab_user_name";
const SESSION_KEY = "villacollab_session";

export const SESSION_EXPIRED_EVENT = "villacollab:session-expired";
export const SESSION_CHANGED_EVENT = "villacollab:session-changed";
export const SECURITY_REQUIRED_EVENT = "villacollab:security-required";

function notifyChanged() {
  window.dispatchEvent(new Event(SESSION_CHANGED_EVENT));
}

export interface Session {
  token: string;
  expiresAt?: number;
  email?: string;
  usuario?: Usuario;
}

function read(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

export function getSession(): Session | null {
  const token = read(TOKEN_KEY);
  if (!token) return null;

  let extra: Omit<Session, "token">;
  try {
    extra = JSON.parse(read(SESSION_KEY) ?? "{}");
  } catch {
    extra = {};
  }

  if (extra.expiresAt && extra.expiresAt * 1000 <= Date.now()) {
    removeKeys();
    window.setTimeout(notifyChanged, 0);
    return null;
  }

  return { token, ...extra };
}

export function getToken(): string | null {
  return getSession()?.token ?? null;
}

export function getUserName(): string | null {
  return getSession() ? read(NAME_KEY) : null;
}

export function getUserId(): string | null {
  return getSession()?.usuario?.id ?? null;
}

export function nivelDaSessao(token = getToken()): "aal1" | "aal2" {
  try {
    const parte = (token ?? "").split(".")[1] ?? "";
    const json = atob(parte.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(parte.length / 4) * 4, "="));
    return JSON.parse(json)?.aal === "aal2" ? "aal2" : "aal1";
  } catch {
    return "aal1";
  }
}

export function paginaInicial(role?: string): string {
  if (role === "lojista") return "/store/dashboard";
  if (role === "admin") return "/admin";
  return "/user/home";
}

export function proximaEtapaDeSeguranca(session: Session | null = getSession()): string | null {
  if (!session) return null;
  if (session.usuario?.trocar_senha) return "/conta/nova-senha";
  if (session.usuario?.role === "admin" && nivelDaSessao(session.token) !== "aal2") return "/conta/verificacao";
  return null;
}

export function saveSession(session: Session) {
  try {
    sessionStorage.setItem(TOKEN_KEY, session.token);
    if (session.usuario) sessionStorage.setItem(NAME_KEY, session.usuario.nome);
    sessionStorage.setItem(
      SESSION_KEY,
      JSON.stringify({
        expiresAt: session.expiresAt,
        email: session.email,
        usuario: session.usuario,
      })
    );
  } catch {
    // sem storage, a sessão vale só nesta aba
  }
  notifyChanged();
}

export function updateSessionUser(usuario: Usuario) {
  const session = getSession();
  if (session) saveSession({ ...session, usuario });
}

function removeKeys() {
  try {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(NAME_KEY);
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // nada a fazer
  }
}

export function clearSession() {
  removeKeys();
  notifyChanged();
}
