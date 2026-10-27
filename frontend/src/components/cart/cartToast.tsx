import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useCart } from "../../contexts/cartContext";

export function CartToast() {
  const { notice } = useCart();
  const navigate = useNavigate();
  const [hiddenId, setHiddenId] = useState<number | null>(null);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setHiddenId(notice.id), 3500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  if (!notice || notice.id === hiddenId) return null;

  return (
    <div
      role="status"
      className="
        fixed
        bottom-5
        right-5
        z-50
        flex
        max-w-sm
        items-center
        gap-4
        rounded-xl
        border
        border-border
        bg-white
        px-4
        py-3
        text-sm
        text-text
        shadow-lg
      "
    >
      <span>{notice.text}</span>

      <button
        type="button"
        onClick={() => {
          setHiddenId(notice.id);
          navigate("/user/carrinho");
        }}
        className="shrink-0 font-medium underline underline-offset-4 hover:opacity-60"
      >
        Ver carrinho
      </button>
    </div>
  );
}
