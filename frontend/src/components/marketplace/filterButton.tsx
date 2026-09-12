import type { ButtonHTMLAttributes } from "react";

interface FilterButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
}

export function FilterButton({
  active = false,
  children,
  className = "",
  ...props
}: FilterButtonProps) {
  return (
    <button
      type="button"
      className={`
        inline-flex items-center justify-center
        rounded-lg border px-4 py-2
        text-sm font-medium
        transition-colors
        ${
          active
            ? "border-black bg-black text-white"
            : "border-gray-300 bg-white text-gray-700 hover:bg-gray-100"
        }
        disabled:cursor-not-allowed
        disabled:opacity-50
        ${className}
      `}
      {...props}
    >
      {children}
    </button>
  );
}