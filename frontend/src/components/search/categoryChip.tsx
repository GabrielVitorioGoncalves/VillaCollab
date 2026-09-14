interface CategoryChipProps {
  label: string;
  active?: boolean;
  onClick?: () => void;
}

export function CategoryChip({
  label,
  active = false,
  onClick,
}: CategoryChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        rounded-full
        border
        px-4
        py-2
        text-sm
        font-medium
        transition-colors
        ${
          active
            ? "border-primary bg-primary text-white"
            : "border-border bg-white text-text hover:bg-background"
        }
      `}
    >
      {label}
    </button>
  );
}