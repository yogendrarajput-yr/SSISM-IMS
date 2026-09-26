import React from 'react';

/**
 * Color style mapping for all hardware statuses, conditions,
 * allocation states, and student fee statuses across SSISM IMS.
 */
const BADGE_STYLES = {
  // Operational Status
  AVAILABLE: 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-emerald-600/20',
  ISSUED: 'bg-blue-50 text-blue-700 border-blue-200 ring-blue-600/20',
  UNDER_MAINTENANCE: 'bg-amber-50 text-amber-700 border-amber-200 ring-amber-600/20',
  RETIRED: 'bg-rose-50 text-rose-700 border-rose-200 ring-rose-600/20',

  // Hardware Condition
  BRAND_NEW: 'bg-teal-50 text-teal-700 border-teal-200 ring-teal-600/20',
  GOOD: 'bg-green-50 text-green-700 border-green-200 ring-green-600/20',
  SCRATCHES: 'bg-yellow-50 text-yellow-700 border-yellow-200 ring-yellow-600/20',
  DAMAGED: 'bg-red-50 text-red-700 border-red-200 ring-red-600/20',

  // Allocation Status
  ACTIVE: 'bg-indigo-50 text-indigo-700 border-indigo-200 ring-indigo-600/20',
  RETURNED: 'bg-slate-100 text-slate-700 border-slate-200 ring-slate-600/20',

  // Fee Status
  PAID: 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-emerald-600/20',
  UNPAID: 'bg-rose-50 text-rose-700 border-rose-200 ring-rose-600/20',
  PARTIAL: 'bg-amber-50 text-amber-700 border-amber-200 ring-amber-600/20',
  EXEMPTED: 'bg-purple-50 text-purple-700 border-purple-200 ring-purple-600/20',
};

/**
 * Universal Badge component for displaying enum statuses with consistent pill styling.
 * 
 * @param {Object} props
 * @param {string} props.status - Enum status value (e.g., 'AVAILABLE', 'PAID')
 * @param {string} [props.text] - Optional override label text
 * @param {'xs'|'sm'|'md'} [props.size='sm'] - Badge size variant
 */
export const Badge = ({ status, text, size = 'sm' }) => {
  const normalizedKey = status ? String(status).toUpperCase() : 'DEFAULT';
  const style = BADGE_STYLES[normalizedKey] || 'bg-slate-100 text-slate-700 border-slate-200';

  const sizeClasses = {
    xs: 'px-2 py-0.5 text-xs',
    sm: 'px-2.5 py-1 text-xs font-semibold',
    md: 'px-3 py-1 text-sm font-semibold',
  }[size];

  const displayText = text || (status ? status.replace(/_/g, ' ') : 'N/A');

  return (
    <span
      className={`inline-flex items-center rounded-full border ring-1 ring-inset ${sizeClasses} ${style}`}
    >
      <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-current opacity-75"></span>
      {displayText}
    </span>
  );
};

