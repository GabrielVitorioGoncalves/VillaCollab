import { CategoryChip } from "./categoryChip";

interface Category {
  id: string;
  name: string;
}

interface CategoryListProps {
  categories: Category[];
  selectedCategory?: string;
  onSelect?: (categoryId: string) => void;
}

export function CategoryList({
  categories,
  selectedCategory,
  onSelect,
}: CategoryListProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2">
      {categories.map((category) => (
        <CategoryChip
          key={category.id}
          label={category.name}
          active={selectedCategory === category.id}
          onClick={() => onSelect?.(category.id)}
        />
      ))}
    </div>
  );
}