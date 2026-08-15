import type { HTMLAttributes } from "react";

type BadgeVariant =
  | "default"
  | "success"
  | "warning"
  | "danger";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

export function Badge({
  variant = "default",
  className = "",
  children,
  ...props
}: BadgeProps) {
  const variants: Record<BadgeVariant, string> = {
    default:
      "bg-gray-100 text-text-secondary",

    success:
      "bg-green-100 text-green-700",

    warning:
      "bg-yellow-100 text-yellow-700",

    danger:
      "bg-red-100 text-red-700",
  };

  return (
    <span
      className={`
        inline-flex
        items-center
        rounded-full
        px-2.5
        py-1
        text-xs
        font-medium
        ${variants[variant]}
        ${className}
      `}
      {...props}
    >
      {children}
    </span>
  );
}

/*
Exemplo de chamada:

<Badge variant="success">
  Ativo
</Badge>

-------

<Badge variant="danger">
  Cancelado
</Badge>

*/