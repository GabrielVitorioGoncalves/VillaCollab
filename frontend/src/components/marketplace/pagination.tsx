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

  const visiveis = new Set(
    [1, totalPages, currentPage - 1, currentPage, currentPage + 1].filter(
      (page) => page >= 1 && page <= totalPages
    )
  );
  const pages: (number | "...")[] = [];
  for (const page of [...visiveis].sort((a, b) => a - b)) {
    const anterior = pages[pages.length - 1];
    if (typeof anterior === "number" && page - anterior > 1) pages.push("...");
    pages.push(page);
  }

  return (
    <nav aria-label="Paginação" className="flex flex-wrap items-center justify-center gap-2">
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

      {pages.map((page, index) => page === "..." ? (
        <span key={`reticencias-${index}`} className="px-1 text-sm text-gray-500">
          …
        </span>
      ) : (
        <button
          key={page}
          type="button"
          aria-current={currentPage === page ? "page" : undefined}
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
    </nav>
  );
}