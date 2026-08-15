import type { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export function Input({
  error = false,
  className = "",
  ...props
}: InputProps) {
  return (
    <input
      className={`
        w-full
        rounded-md
        border
        bg-white
        px-3
        py-2
        text-sm
        text-text
        outline-none
        transition-colors

        placeholder:text-muted

        focus:border-primary
        focus:ring-1
        focus:ring-primary

        disabled:cursor-not-allowed
        disabled:bg-gray-100

        ${error ? "border-danger focus:border-danger focus:ring-danger" : "border-border"}

        ${className}
      `}
      {...props}
    />
  );
}

/*
Exemplo de chamada:
    <Input
        type="email"
        placeholder="seu@email.com"
    />
*/