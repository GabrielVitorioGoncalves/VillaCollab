import { useCallback, useEffect, useEffectEvent, useState } from "react";

import { errorMessage } from "../lib/api";

interface RequestState<T> {
  key: string | null;
  data?: T;
  error?: string;
}

export function useRequest<T>(key: string | null, fetcher: () => Promise<T>) {
  const [nonce, setNonce] = useState(0);
  const [state, setState] = useState<RequestState<T>>({ key: null });

  const requestKey = key === null ? null : `${key}#${nonce}`;
  const runFetcher = useEffectEvent(fetcher);

  useEffect(() => {
    if (requestKey === null) return;

    let active = true;

    runFetcher().then(
      (data) => {
        if (active) setState({ key: requestKey, data });
      },
      (error: unknown) => {
        if (active) setState({ key: requestKey, error: errorMessage(error) });
      }
    );

    return () => {
      active = false;
    };
  }, [requestKey]);

  const settled = requestKey !== null && state.key === requestKey;

  const reload = useCallback(() => setNonce((value) => value + 1), []);

  const mutate = useCallback(
    (data: T) => setState({ key: requestKey, data }),
    [requestKey]
  );

  return {
    data: settled ? state.data : undefined,
    error: settled ? state.error : undefined,
    loading: requestKey !== null && !settled,
    reload,
    mutate,
  };
}
