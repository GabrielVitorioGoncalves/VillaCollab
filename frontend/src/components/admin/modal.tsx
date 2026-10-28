import { useEffect, useEffectEvent, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

interface ModalProps {
  title: string;
  description?: string;
  children?: ReactNode;
  footer: ReactNode;
  onClose: () => void;
}

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';

export function Modal({ title, description, children, footer, onClose }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const close = useEffectEvent(onClose);

  useEffect(() => {
    const dialog = dialogRef.current;
    const previouslyFocused = document.activeElement as HTMLElement | null;

    function getFocusable() {
      return dialog ? Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)) : [];
    }

    const [firstFocusable] = getFocusable();
    (firstFocusable ?? dialog)?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        close();
        return;
      }

      if (event.key !== "Tab") return;

      const focusable = getFocusable();
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      previouslyFocused?.focus();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-modal-title"
        tabIndex={-1}
        className="w-full max-w-md rounded-xl border border-border bg-white p-6 shadow-lg outline-none"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="admin-modal-title" className="text-lg font-semibold text-text">
              {title}
            </h2>
            {description && <p className="mt-1 text-sm text-text-secondary">{description}</p>}
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-background-secondary hover:text-text"
          >
            <X size={16} />
          </button>
        </div>

        {children && <div className="mt-5">{children}</div>}

        <div className="mt-6 flex justify-end gap-3">{footer}</div>
      </div>
    </div>
  );
}
