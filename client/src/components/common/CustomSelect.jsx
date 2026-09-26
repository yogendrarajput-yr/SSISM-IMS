import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

/**
 * CustomSelect Component
 * 
 * Replaces native browser <select> elements with an accessible, Tailwind-styled
 * dropdown matching the SSISM theme. Floats cleanly above tables with z-50.
 * 
 * @param {Object} props
 * @param {string|number} props.value - Currently selected value
 * @param {Function} props.onChange - Callback invoked with new value
 * @param {Array<{value: any, label: string, icon?: any}>} props.options - Selectable options
 * @param {string} [props.placeholder='Select...'] - Fallback label when nothing selected
 * @param {string} [props.className=''] - Additional container classes
 * @param {boolean} [props.disabled=false] - Whether dropdown is disabled
 */
export const CustomSelect = ({
  value,
  onChange,
  options = [],
  placeholder = 'Select...',
  className = '',
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Find active option label
  const selectedOption = options.find((opt) => String(opt.value) === String(value));
  const displayLabel = selectedOption ? selectedOption.label : placeholder;

  const handleSelect = (val) => {
    onChange(val);
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full px-3 py-2 text-xs rounded-xl border flex items-center justify-between text-left transition-all duration-150 outline-none ${
          isOpen
            ? 'border-[#F26522] ring-2 ring-orange-500/20 bg-white'
            : 'border-slate-200 hover:border-slate-300 bg-white'
        } ${disabled ? 'opacity-50 cursor-not-allowed bg-slate-50' : 'cursor-pointer'} ${
          selectedOption && selectedOption.value !== '' ? 'text-slate-800 font-semibold' : 'text-slate-600'
        }`}
      >
        <span className="truncate pr-2">{displayLabel}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 flex-shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-[#F26522]' : ''
          }`}
        />
      </button>

      {/* Floating Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-1.5 w-full min-w-[190px] bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-100">
          {options.length === 0 ? (
            <div className="px-3 py-2 text-xs text-slate-400 italic">No options available</div>
          ) : (
            options.map((option) => {
              const isSelected = String(option.value) === String(value);
              return (
                <div
                  key={String(option.value)}
                  onClick={() => handleSelect(option.value)}
                  className={`px-3 py-2 text-xs flex items-center justify-between cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-orange-50 text-[#F26522] font-bold'
                      : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <span className="truncate pr-2">{option.label}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-[#F26522] flex-shrink-0" />}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
