import type { ReactNode } from "react";

interface FormFieldProps {
  label: string;
  children: ReactNode;
  error?: string;
  helperText?: string;
  required?: boolean;
}

export function FormField({
  label,
  children,
  error,
  helperText,
  required = false,
}: FormFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-text">
        {label}

        {required && (
          <span className="ml-1 text-danger">
            *
          </span>
        )}
      </label>

      {children}

      {error && (
        <span className="text-xs text-danger">
          {error}
        </span>
      )}

      {!error && helperText && (
        <span className="text-xs text-text-secondary">
          {helperText}
        </span>
      )}
    </div>
  );
}

/*
Exemplo de chamada:
(Ja com input)

<FormField label="Email"
  required error="Digite um email válido">
  <Input 
    type="email"
    error
  />
</FormField>
*/