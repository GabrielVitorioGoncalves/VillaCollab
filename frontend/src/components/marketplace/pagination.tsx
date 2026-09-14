interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: PaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  const pages = Array.from(
    { length: totalPages },
    (_, index) => index + 1
  );

  return (
    <div className="flex items-center justify-center gap-2">
      <button
        type="button"
        disabled={currentPage === 1}
        onClick={() => onPageChange(currentPage - 1)}
        className="
          rounded-lg border border-gray-300
          bg-white px-3 py-2
          text-sm
          transition-colors
          hover:bg-gray-100
          disabled:cursor-not-allowed
          disabled:opacity-50
        "
      >
        Anterior
      </button>

      {pages.map((page) => (
        <button
          key={page}
          type="button"
          onClick={() => onPageChange(page)}
          className={`
            min-w-10 rounded-lg border px-3 py-2
            text-sm font-medium
            transition-colors
            ${
              currentPage === page
                ? "border-black bg-black text-white"
                : "border-gray-300 bg-white text-gray-700 hover:bg-gray-100"
            }
          `}
        >
          {page}
        </button>
      ))}

      <button
        type="button"
        disabled={currentPage === totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        className="
          rounded-lg border border-gray-300
          bg-white px-3 py-2
          text-sm
          transition-colors
          hover:bg-gray-100
          disabled:cursor-not-allowed
          disabled:opacity-50
        "
      >
        Próxima
      </button>
    </div>
  );
}