import React from 'react';

/**
 * Universal Metric StatCard Component
 * 
 * Provides a clean, minimalist, executive design with identical shadows,
 * slim 2px top accent line, refined icon container, and uniform neutral hover state.
 * 
 * All colored hover artifacts and harsh shadow jumps have been eliminated.
 */
export const StatCard = ({
  title,
  value,
  icon: Icon,
  color = 'orange',
  subtitle,
  active = false,
  onClick,
  className = '',
}) => {
  // Slim, elegant 2px top accent line
  const topAccentMap = {
    orange: 'border-t-2 border-[#F26522]',
    green: 'border-t-2 border-emerald-500',
    blue: 'border-t-2 border-blue-500',
    red: 'border-t-2 border-rose-500',
    purple: 'border-t-2 border-purple-500',
    amber: 'border-t-2 border-amber-500',
    slate: 'border-t-2 border-slate-500',
  };

  // Icon badge container styling (subtle, clean pastel tint)
  const iconColorMap = {
    orange: 'bg-orange-50 text-[#F26522] border border-orange-100',
    green: 'bg-emerald-50 text-emerald-600 border border-emerald-100',
    blue: 'bg-blue-50 text-blue-600 border border-blue-100',
    red: 'bg-rose-50 text-rose-600 border border-rose-100',
    purple: 'bg-purple-50 text-purple-600 border border-purple-100',
    amber: 'bg-amber-50 text-amber-600 border border-amber-100',
    slate: 'bg-slate-100 text-slate-700 border border-slate-200',
  };

  const topBorder = topAccentMap[color] || topAccentMap.orange;
  const iconStyle = iconColorMap[color] || iconColorMap.orange;

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs transition-all duration-150 ${topBorder} ${
        active
          ? 'ring-1 ring-slate-800 border-slate-800 bg-slate-50/40'
          : 'hover:border-slate-300 hover:shadow-xs'
      } ${
        onClick ? 'cursor-pointer select-none active:scale-[0.99]' : ''
      } ${className}`}
    >
      <div className="flex items-center justify-between">
        <div className="min-w-0 pr-2">
          <div className="flex items-center space-x-1.5">
            <p className="text-[11px] font-bold text-slate-500 tracking-wider uppercase truncate">
              {title}
            </p>
            {active && (
              <span
                className="w-1.5 h-1.5 rounded-full bg-slate-800 shrink-0"
                title="Active Filter"
              />
            )}
          </div>
          <h3 className="text-2xl sm:text-[26px] font-extrabold text-slate-900 mt-1 tracking-tight truncate">
            {value}
          </h3>
          {subtitle && (
            <p className="text-[11px] text-slate-400 font-medium mt-0.5 truncate">{subtitle}</p>
          )}
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconStyle}`}>
          {Icon && <Icon className="w-5 h-5" />}
        </div>
      </div>
    </div>
  );
};
