import { Link } from "react-router-dom";
import { Button } from "./button";

export function RequestState({ loading, error, onRetry }: {
  loading: boolean; error: string; onRetry: () => void;
}) {
  if (loading) return <p role="status" className="py-10 text-text-secondary">Carregando...</p>;
  if (!error) return null;
  return <div role="alert" className="my-6 space-y-3 rounded-xl border border-border bg-white p-5">
    <p className="text-danger">{error}</p>
    <div className="flex flex-wrap gap-4">
      <Button variant="outline" onClick={onRetry}>Tentar novamente</Button>
      <Link to="/" className="self-center text-sm underline">Entrar na conta</Link>
    </div>
  </div>;
}
