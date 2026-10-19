export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

interface ApiOptions {
  method?: "GET" | "POST" | "PATCH";
  body?: unknown;
  auth?: boolean;
  signal?: AbortSignal;
}

export async function api<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const base = (import.meta.env?.VITE_API_URL || "http://localhost:3333").replace(/\/+$/, "");
  const headers: Record<string, string> = { Accept: "application/json" };
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  if (options.auth) {
    const token = sessionStorage.getItem("villacollab_token");
    if (!token) throw new ApiError("Entre na sua conta para continuar.", 401);
    headers.Authorization = `Bearer ${token}`;
  }

  // O primeiro acesso ao Render gratuito pode levar cerca de um minuto.
  const timeout = AbortSignal.timeout(90_000);
  const signal = options.signal ? AbortSignal.any([options.signal, timeout]) : timeout;
  let response: Response;
  try {
    response = await fetch(`${base}/api${path}`, {
      method: options.method || "GET", headers, signal,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch (error) {
    if (options.signal?.aborted) throw error;
    throw new ApiError(timeout.aborted
      ? "O serviço demorou para responder. Tente novamente em instantes."
      : "Não foi possível conectar à API. Confira sua conexão e tente novamente.", 0);
  }

  let content: string;
  try { content = await response.text(); }
  catch { throw new ApiError("A conexão foi interrompida antes de confirmar a resposta.", 0); }
  let data: unknown;
  try { data = content ? JSON.parse(content) : null; }
  catch { throw new ApiError("O serviço não respondeu corretamente. Tente novamente em instantes.", response.status); }
  if (!response.ok) {
    const message = data && typeof data === "object" && "erro" in data && typeof data.erro === "string"
      ? data.erro : "Não foi possível concluir a operação.";
    throw new ApiError(response.status === 401 ? "Sua sessão expirou. Entre novamente para continuar." : message, response.status);
  }
  return data as T;
}
