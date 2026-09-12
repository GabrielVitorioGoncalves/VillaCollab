import type { SelectHTMLAttributes } from "react";

export interface SortOption {
  value: string;
  label: string;
}

interface SortSelectProps
  extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "onChange"> {
  options: SortOption[];
  value: string;
  onChange: (value: string) => void;
}

export function SortSelect({
  options,
  value,
  onChange,
  className = "",
  ...props
}: SortSelectProps) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={`
        rounded-lg border border-gray-300
        bg-white px-4 py-2
        text-sm text-gray-700
        outline-none
        transition-colors
        focus:border-black
        ${className}
      `}
      {...props}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}