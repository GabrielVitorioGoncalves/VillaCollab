import type { PermissaoAdmin, TipoAdministrador } from "../../types/admin";

const TIPOS_ADMIN: TipoAdministrador[] = ["Admin", "Gerente", "Suporte"];

const PERMISSOES_ADMIN: { value: PermissaoAdmin; label: string }[] = [
  { value: "lojas", label: "Gerenciar lojas" },
  { value: "produtos", label: "Gerenciar produtos" },
  { value: "usuarios", label: "Gerenciar usuários" },
  { value: "relatorios", label: "Visualizar relatórios" },
];

const TODAS_PERMISSOES = PERMISSOES_ADMIN.map((permissao) => permissao.value);

interface AdminAccessFieldsProps {
  tipo: TipoAdministrador;
  permissoes: PermissaoAdmin[];
  disponiveis: PermissaoAdmin[];
  onTipoChange: (tipo: TipoAdministrador) => void;
  onPermissoesChange: (permissoes: PermissaoAdmin[]) => void;
  error?: string;
}

export function AdminAccessFields({
  tipo,
  permissoes,
  disponiveis,
  onTipoChange,
  onPermissoesChange,
  error,
}: AdminAccessFieldsProps) {
  const podeAdmin = TODAS_PERMISSOES.every((permissao) => disponiveis.includes(permissao));
  const marcadas = tipo === "Admin" ? TODAS_PERMISSOES : permissoes;

  function toggle(permissao: PermissaoAdmin) {
    onPermissoesChange(
      permissoes.includes(permissao) ? permissoes.filter((item) => item !== permissao) : [...permissoes, permissao]
    );
  }

  return (
    <>
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-text">Tipo de administrador</span>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {TIPOS_ADMIN.map((item) => {
            const selected = tipo === item;
            const disabled = item === "Admin" && !podeAdmin;

            return (
              <button
                key={item}
                type="button"
                aria-pressed={selected}
                disabled={disabled}
                title={disabled ? "Só quem tem todas as permissões pode criar um Admin" : undefined}
                onClick={() => onTipoChange(item)}
                className={`rounded-md border px-3 py-2 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                  selected
                    ? "border-primary bg-white font-semibold text-text ring-1 ring-primary"
                    : "border-border bg-white text-text-secondary hover:bg-background"
                }`}
              >
                {item}
              </button>
            );
          })}
        </div>
      </div>

      <fieldset className="space-y-2">
        <legend className="mb-2 text-sm font-medium text-text">Permissões</legend>
        {PERMISSOES_ADMIN.map((permissao) => {
          const disabled = tipo === "Admin" || !disponiveis.includes(permissao.value);

          return (
            <label key={permissao.value} className={`flex items-center gap-2 ${disabled ? "opacity-60" : ""}`}>
              <input
                type="checkbox"
                checked={marcadas.includes(permissao.value)}
                disabled={disabled}
                onChange={() => toggle(permissao.value)}
                className="h-4 w-4 rounded border-border"
              />
              <span className="text-sm text-text">{permissao.label}</span>
            </label>
          );
        })}
        <p className="text-xs text-text-secondary">
          {tipo === "Admin"
            ? "O tipo Admin tem todas as permissões."
            : "Você só pode dar permissões que a sua conta também tem."}
        </p>
        {error && <p className="text-xs text-danger">{error}</p>}
      </fieldset>
    </>
  );
}
