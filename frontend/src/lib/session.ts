import type { Usuario } from "../types/api";

// Mantém as chaves que o login já usava, para não derrubar sessões abertas.
const TOKEN_KEY = "villacollab_token";
const NAME_KEY = "villacollab_user_name";
const SESSION_KEY = "villacollab_session";

export const SESSION_EXPIRED_EVENT = "villacollab:session-expired";
// Disparado em todo login/logout; o carrinho usa para trocar de dono.
export const SESSION_CHANGED_EVENT = "villacollab:session-changed";

function notifyChanged() {
  window.dispatchEvent(new Event(SESSION_CHANGED_EVENT));
}

export interface Session {
  token: string;
  expiresAt?: number; // segundos (formato do Supabase)
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

  let extra: Omit<Session, "token"> = {};
  try {
    extra = JSON.parse(read(SESSION_KEY) ?? "{}");
  } catch {
    extra = {};
  }

  if (extra.expiresAt && extra.expiresAt * 1000 <= Date.now()) {
    removeKeys();
    // Pode estar no meio de uma renderização: avisa os ouvintes depois.
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
    // Navegação privada pode bloquear o storage; o login segue valendo só nesta aba.
  }
  notifyChanged();
}

// Depois de editar o perfil, mantém o nome do cabeçalho em dia.
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
