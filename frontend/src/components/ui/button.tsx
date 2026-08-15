import type { ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary" | "outline" | "danger" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

export function Button({
  variant = "primary",
  className = "",
  children,
  ...props
}: ButtonProps) {
  const variants: Record<ButtonVariant, string> = {
    primary:
      "bg-primary text-white hover:bg-primary-hover",

    secondary:
      "bg-gray-200 text-text hover:bg-gray-300",

    outline:
      "border border-border bg-white text-text hover:bg-background",

    danger:
      "bg-danger text-white hover:bg-red-700",

    ghost:
      "bg-transparent text-text hover:bg-gray-100",
  };

  return (
    <button
      className={`
        inline-flex
        items-center
        justify-center
        rounded-md
        px-4
        py-2
        text-sm
        font-medium
        transition-colors
        duration-200
        disabled:cursor-not-allowed
        disabled:opacity-50
        ${variants[variant]}
        ${className}
      `}
      {...props}
    >
      {children}
    </button>
  );
}

/*
Exemplo de chamada:
    <Button>
    Criar conta
    </Button>

    ----------------

    <Button type="submit" 
        disabled={loading}>
        Entrar
    </Button>
*/