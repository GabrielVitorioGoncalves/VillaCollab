import { FilterButton } from "./filterButton";

export interface ProductFilter {
  id: string;
  label: string;
}

interface ProductFiltersProps {
  filters: ProductFilter[];
  selectedFilter: string;
  onSelect: (filterId: string) => void;
}

export function ProductFilters({
  filters,
  selectedFilter,
  onSelect,
}: ProductFiltersProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {filters.map((filter) => (
        <FilterButton
          key={filter.id}
          active={selectedFilter === filter.id}
          onClick={() => onSelect(filter.id)}
        >
          {filter.label}
        </FilterButton>
      ))}
    </div>
  );
}