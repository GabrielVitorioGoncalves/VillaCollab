import { useEffect, useState } from "react";

export function useDebouncedValue<T>(valor: T, atraso = 300): T {
  const [atrasado, setAtrasado] = useState(valor);

  useEffect(() => {
    const timer = window.setTimeout(() => setAtrasado(valor), atraso);
    return () => window.clearTimeout(timer);
  }, [valor, atraso]);

  return atrasado;
}
