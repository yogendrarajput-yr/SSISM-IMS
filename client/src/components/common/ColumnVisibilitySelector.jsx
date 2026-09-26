import React, { useState, useRef, useEffect } from 'react';
import { SlidersHorizontal, Check, RotateCcw } from 'lucide-react';

/**
 * Universal Column Visibility Selector Dropdown
 * 
 * Allows users to customize table columns according to their preference.
 * Supports localStorage persistence, required column locking, and bulk show/reset actions.
 * 
 * @param {Object} props
 * @param {Array<{ key: string, label: string, required?: boolean }>} props.columns - All available columns
 * @param {string[]} props.visibleColumns - Currently visible column keys
 * @param {Function} props.onChange - Callback when visible columns change
 * @param {string} [props.storageKey] - Optional localStorage key for persistent preferences
 */
export const ColumnVisibilitySelector = ({
  columns = [],
  visibleColumns = [],
  onChange,
  storageKey,
}) => {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  // Handle toggling an individual column
  const handleToggle = (key) => {
    const col = columns.find((c) => c.key === key);
    if (col?.required) return; // Cannot toggle mandatory columns

    let next;
    if (visibleColumns.includes(key)) {
      // Don't allow unchecking all columns
      if (visibleColumns.length <= 1) return;
      next = visibleColumns.filter((k) => k !== key);
    } else {
      next = [...visibleColumns, key];
    }

    onChange(next);
    if (storageKey) {
      localStorage.setItem(storageKey, JSON.stringify(next));
    }
  };

  // Show all columns
  const handleShowAll = () => {
    const allKeys = columns.map((c) => c.key);
    onChange(allKeys);
    if (storageKey) {
      localStorage.setItem(storageKey, JSON.stringify(allKeys));
    }
  };

  // Reset to default columns
  const handleReset = () => {
    const defaultKeys = columns.map((c) => c.key);
    onChange(defaultKeys);
    if (storageKey) {
      localStorage.removeItem(storageKey);
    }
  };

  const visibleCount = visibleColumns.length;
  const totalCount = columns.length;

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center space-x-1.5 transition shadow-2xs ${
          open
            ? 'bg-orange-50 border-[#F26522] text-[#F26522]'
            : 'bg-white border-slate-300 hover:bg-slate-50 text-slate-700'
        }`}
        title="Customize visible table columns"
      >
        <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
        <span>Columns ({visibleCount}/{totalCount})</span>
      </button>

      {/* Floating Checkbox Menu */}
      {open && (
        <div className="absolute right-0 mt-1.5 w-60 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
          <div className="px-3 py-1.5 border-b border-slate-100 flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Customize Columns
            </span>
            <button
              onClick={handleReset}
              className="text-[10.5px] font-bold text-orange-600 hover:text-orange-700 flex items-center space-x-1"
              title="Reset all columns to default"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          </div>

          <div className="max-h-64 overflow-y-auto px-1 py-1 space-y-0.5">
            {columns.map((col) => {
              const isChecked = visibleColumns.includes(col.key);
              const isRequired = Boolean(col.required);

              return (
                <label
                  key={col.key}
                  className={`flex items-center space-x-2.5 px-2.5 py-1.5 rounded-lg text-xs transition cursor-pointer select-none ${
                    isRequired
                      ? 'opacity-60 cursor-not-allowed bg-slate-50'
                      : 'hover:bg-slate-100'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    disabled={isRequired}
                    onChange={() => handleToggle(col.key)}
                    className="rounded border-slate-300 text-[#F26522] focus:ring-orange-500/20 cursor-pointer w-4 h-4"
                  />
                  <span className={`flex-1 font-medium ${isChecked ? 'text-slate-800' : 'text-slate-400'}`}>
                    {col.label}
                  </span>
                  {isRequired && (
                    <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-400">
                      Required
                    </span>
                  )}
                </label>
              );
            })}
          </div>

          <div className="px-3 pt-2 border-t border-slate-100 flex justify-between">
            <button
              type="button"
              onClick={handleShowAll}
              className="text-xs font-bold text-slate-600 hover:text-slate-900"
            >
              Select All
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="px-2.5 py-1 bg-slate-900 text-white rounded-lg text-[11px] font-bold hover:bg-slate-800 transition"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
