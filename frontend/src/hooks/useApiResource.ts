import { useEffect, useState } from "react";
import { api } from "../lib/api";

export function useApiResource<T>(path: string | null, auth = false) {
  const [revision, setRevision] = useState(0);
  const key = `${path}:${revision}`;
  const [result, setResult] = useState<{ key: string; data: T | null; error: string } | null>(null);

  useEffect(() => {
    if (!path) return;
    const controller = new AbortController();
    api<T>(path, { auth, signal: controller.signal }).then(
      data => { if (!controller.signal.aborted) setResult({ key, data, error: "" }); },
      error => {
        if (!controller.signal.aborted) setResult({ key, data: null,
          error: error instanceof Error ? error.message : "Não foi possível carregar os dados." });
      },
    );
    return () => controller.abort();
  }, [path, auth, key]);

  return {
    data: result?.key === key ? result.data : null,
    error: result?.key === key ? result.error : "",
    loading: path !== null && result?.key !== key,
    reload: () => setRevision(value => value + 1),
  };
}
