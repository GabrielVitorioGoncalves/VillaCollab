import { Search, X } from "lucide-react";
import { Input } from "../ui/input";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSearch?: () => void;
  placeholder?: string;
}

export function SearchBar({
  value,
  onChange,
  onSearch,
  placeholder = "Buscar produtos, lojas...",
}: SearchBarProps) {
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSearch?.();
  }

  function handleClear() {
    onChange("");
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="relative w-full"
    >
      <Search
        size={18}
        className="
          pointer-events-none
          absolute
          left-3
          top-1/2
          -translate-y-1/2
          text-text-secondary
        "
      />

      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="pl-10 pr-10"
      />

      {value && (
        <button
          type="button"
          onClick={handleClear}
          className="
            absolute
            right-3
            top-1/2
            -translate-y-1/2
            text-text-secondary
            transition-colors
            hover:text-text
          "
          aria-label="Limpar busca"
        >
          <X size={17} />
        </button>
      )}
    </form>
  );
}