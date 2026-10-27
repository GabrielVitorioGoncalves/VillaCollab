import { clearSession, getToken, SESSION_EXPIRED_EVENT } from "./session";

const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:3333").replace(/\/+$/, "");

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  file?: Blob;
  headers?: Record<string, string>;
  auth?: boolean;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, file, auth = false } = options;
  const headers: Record<string, string> = { ...options.headers };

  if (file) headers["Content-Type"] = file.type || "application/octet-stream";
  else if (body !== undefined) headers["Content-Type"] = "application/json";

  if (auth) {
    const token = getToken();
    if (!token) {
      notifySessionExpired();
      throw new ApiError("Entre na sua conta para continuar.", 401);
    }
    headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${API_URL}/api${path}`, {
      method,
      headers,
      body: file ?? (body === undefined ? undefined : JSON.stringify(body)),
    });
  } catch {
    throw new ApiError("Não foi possível conectar ao servidor. Tente novamente.", 0);
  }

  if (response.status === 204) return undefined as T;

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    if (response.status === 401 && auth) notifySessionExpired();
    let message =
      data && typeof data.erro === "string" ? data.erro : "Não foi possível concluir a operação.";
    const details = data?.detalhes && typeof data.detalhes === "object" ? Object.values(data.detalhes) : [];
    const first = details.flat().find((item): item is string => typeof item === "string");
    if (response.status === 400 && first) message = `${message}: ${first}`;
    throw new ApiError(message, response.status);
  }

  return data as T;
}

function notifySessionExpired() {
  clearSession();
  window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
}

export function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return "Algo deu errado. Tente novamente.";
}
