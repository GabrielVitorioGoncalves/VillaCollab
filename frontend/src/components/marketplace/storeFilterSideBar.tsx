import { useState } from "react";

export interface StoreFilterOption {
  id: string;
  label: string;
}

export interface StoreFilter {
  id: string;
  name: string;
  type: "checkbox" | "radio";
  options: StoreFilterOption[];
}

interface StoreFilterSidebarProps {
  filters: StoreFilter[];
  selectedFilters: Record<string, string[]>;
  onChange: (filterId: string, optionId: string) => void;
  onClear?: () => void;
}

export function StoreFilterSidebar({
  filters,
  selectedFilters,
  onChange,
  onClear,
}: StoreFilterSidebarProps) {
  return (
    <aside className="w-full lg:w-[210px] shrink-0">
      <div className="border-b border-border pb-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-text">
            Filtro
          </h3>

          {onClear && (
            <button
              type="button"
              onClick={onClear}
              className="text-xs text-text-secondary underline hover:text-text"
            >
              Limpar
            </button>
          )}
        </div>
      </div>

      <div className="divide-y divide-border">
        {filters.map((filter) => (
          <FilterGroup
            key={filter.id}
            filter={filter}
            selectedOptions={selectedFilters[filter.id] ?? []}
            onChange={onChange}
          />
        ))}
      </div>
    </aside>
  );
}

interface FilterGroupProps {
  filter: StoreFilter;
  selectedOptions: string[];
  onChange: (filterId: string, optionId: string) => void;
}

function FilterGroup({
  filter,
  selectedOptions,
  onChange,
}: FilterGroupProps) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="py-5">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between text-left"
      >
        <span className="text-sm font-semibold text-text">
          {filter.name}
        </span>

        <span className="text-sm text-text">
          {expanded ? "−" : "+"}
        </span>
      </button>

      {expanded && (
        <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2">
          {filter.options.map((option) => {
            const selected = selectedOptions.includes(option.id);

            return (
              <label
                key={option.id}
                className="flex cursor-pointer items-center gap-2 text-sm text-text-secondary"
              >
                <input
                  type={filter.type}
                  name={
                    filter.type === "radio"
                      ? `filter-${filter.id}`
                      : undefined
                  }
                  checked={selected}
                  onChange={() => onChange(filter.id, option.id)}
                  className="h-4 w-4"
                />

                <span>{option.label}</span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}