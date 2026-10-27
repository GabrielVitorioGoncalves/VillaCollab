import { Button } from "./button";

interface RequestStatusProps {
  loading?: boolean;
  error?: string;
  onRetry?: () => void;
  loadingText?: string;
}

// Estado de carregamento/erro reaproveitado pelas páginas que buscam dados na API.
export function RequestStatus({
  loading,
  error,
  onRetry,
  loadingText = "Carregando...",
}: RequestStatusProps) {
  if (loading) {
    return (
      <div className="flex min-h-48 items-center justify-center rounded-[22px] border border-border bg-surface">
        <p className="text-sm text-text-secondary">{loadingText}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-48 flex-col items-center justify-center gap-4 rounded-[22px] border border-border bg-surface px-6 text-center">
        <p className="text-sm text-text-secondary">{error}</p>

        {onRetry && (
          <Button variant="outline" onClick={onRetry}>
            Tentar de novo
          </Button>
        )}
      </div>
    );
  }

  return null;
}
