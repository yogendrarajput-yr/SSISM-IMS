import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Universal Table Pagination Bar
 * 
 * Includes current record range, entries per page selector (10, 15, 20, 50, 100),
 * and page navigation buttons.
 * 
 * @param {Object} props
 * @param {number} props.page - Current active page number (1-based)
 * @param {number} props.totalPages - Total calculated pages
 * @param {number} props.total - Total records count across all pages
 * @param {number} props.limit - Records per page limit
 * @param {Function} props.onPageChange - Callback when user clicks prev/next or page number
 * @param {Function} props.onLimitChange - Callback when user changes rows per page dropdown
 * @param {string} [props.itemName='records'] - Noun for the records being paginated
 */
export const Pagination = ({
  page = 1,
  totalPages = 1,
  total = 0,
  limit = 15,
  onPageChange,
  onLimitChange,
  itemName = 'records',
}) => {
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);
  const safeTotalPages = Math.max(1, totalPages || 1);

  return (
    <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
      {/* Left: Record Range and Rows per Page Dropdown */}
      <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
        <span className="text-slate-600">
          Showing <strong className="text-slate-800 font-bold">{from}</strong> – <strong className="text-slate-800 font-bold">{to}</strong> of <strong className="text-slate-800 font-bold">{total}</strong> {itemName}
        </span>

        {onLimitChange && (
          <div className="flex items-center space-x-1.5 pl-3 sm:border-l sm:border-slate-200">
            <label htmlFor="entries-limit-select" className="text-slate-500 font-medium whitespace-nowrap">
              Rows:
            </label>
            <select
              id="entries-limit-select"
              value={limit}
              onChange={(e) => onLimitChange(Number(e.target.value))}
              className="px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-700 outline-none focus:border-[#F26522] focus:ring-1 focus:ring-[#F26522] cursor-pointer shadow-2xs"
              title="Select number of entries to display per page"
            >
              <option value={10}>10</option>
              <option value={15}>15</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        )}
      </div>

      {/* Right: Page Navigation Controls */}
      <div className="flex items-center space-x-1.5 w-full sm:w-auto justify-end">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(Math.max(1, page - 1))}
          className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-xs flex items-center space-x-1 transition shadow-2xs text-slate-700"
          title="Previous Page"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Prev</span>
        </button>

        <span className="px-3 py-1 font-bold text-slate-800 text-xs bg-white border border-slate-200 rounded-lg shadow-2xs">
          Page {page} of {safeTotalPages}
        </span>

        <button
          type="button"
          disabled={page >= safeTotalPages}
          onClick={() => onPageChange(page + 1)}
          className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-xs flex items-center space-x-1 transition shadow-2xs text-slate-700"
          title="Next Page"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
