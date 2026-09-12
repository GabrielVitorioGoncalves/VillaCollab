import { Edit, Trash2 } from "lucide-react";

interface TableActionsProps {
  onEdit?: () => void;
  onDelete?: () => void;
}

export function TableActions({
  onEdit,
  onDelete,
}: TableActionsProps) {
  return (
    <div className="flex items-center gap-2">
      {onEdit && (
        <button
          type="button"
          onClick={onEdit}
          aria-label="Editar"
          className="
            flex h-8 w-8
            items-center justify-center
            rounded-md
            text-text-secondary
            transition-colors
            hover:bg-background-secondary
            hover:text-text
          "
        >
          <Edit size={16} />
        </button>
      )}

      {onDelete && (
        <button
          type="button"
          onClick={onDelete}
          aria-label="Excluir"
          className="
            flex h-8 w-8
            items-center justify-center
            rounded-md
            text-text-secondary
            transition-colors
            hover:bg-red-50
            hover:text-red-600
          "
        >
          <Trash2 size={16} />
        </button>
      )}
    </div>
  );
}