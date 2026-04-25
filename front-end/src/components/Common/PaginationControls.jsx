import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const buildPageItems = (currentPage, totalPages) => {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (currentPage <= 3) {
    return [1, 2, 3, 4, "...", totalPages];
  }

  if (currentPage >= totalPages - 2) {
    return [1, "...", totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }

  return [1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages];
};

const PaginationControls = ({
  page = 1,
  totalPages = 1,
  onPageChange,
  disabled = false,
}) => {
  if (totalPages <= 1) {
    return null;
  }

  const pageItems = buildPageItems(page, totalPages);

  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <button
        type="button"
        disabled={disabled || page <= 1}
        onClick={() => onPageChange(page - 1)}
        className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 transition-all hover:border-emerald-200 hover:text-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <ChevronLeft size={16} />
        Trước
      </button>

      <div className="flex flex-wrap items-center justify-center gap-2">
        {pageItems.map((item, index) =>
          item === "..." ? (
            <span
              key={`ellipsis-${index}`}
              className="px-2 text-sm font-semibold text-gray-400"
            >
              ...
            </span>
          ) : (
            <button
              key={item}
              type="button"
              disabled={disabled}
              onClick={() => onPageChange(item)}
              className={`h-10 min-w-10 rounded-xl px-3 text-sm font-semibold transition-all ${
                item === page
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-200"
                  : "border border-gray-200 bg-white text-gray-600 hover:border-emerald-200 hover:text-emerald-600"
              } disabled:cursor-not-allowed disabled:opacity-50`}
            >
              {item}
            </button>
          )
        )}
      </div>

      <button
        type="button"
        disabled={disabled || page >= totalPages}
        onClick={() => onPageChange(page + 1)}
        className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 transition-all hover:border-emerald-200 hover:text-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Sau
        <ChevronRight size={16} />
      </button>
    </div>
  );
};

export default PaginationControls;
