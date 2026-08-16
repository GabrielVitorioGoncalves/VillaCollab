import type { HTMLAttributes } from "react";

export function Card({
  className = "",
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`
        rounded-lg
        border
        border-border
        bg-surface
        shadow-sm
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
}

/*
Exemplo de chamada:

    <Card className="p-6">
    <h2 className="text-lg font-semibold">
        Informações da loja
    </h2>

    <p className="text-sm text-text-secondary">
        Dados cadastrados da loja.
    </p>
    </Card>
*/