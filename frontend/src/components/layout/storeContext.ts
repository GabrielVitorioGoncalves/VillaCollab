import { useOutletContext } from "react-router-dom";

import type { MinhaLoja } from "../../types/api";

export interface StoreContextValue {
  loja: MinhaLoja;
  setLoja: (loja: MinhaLoja) => void;
}

export function useStore(): StoreContextValue {
  return useOutletContext<StoreContextValue>();
}
