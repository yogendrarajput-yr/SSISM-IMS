import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

/**
 * CustomSelect Component
 * 
 * Replaces native browser <select> elements with an accessible, Tailwind-styled
 * dropdown matching the SSISM theme.
 * 
 * Key Features:
 * - Guaranteed DOWNWARD opening (top-full mt-1.5) so options never overlap the trigger or open upwards.
 * - Auto horizontal alignment: detect viewport edges so it never overflows off-screen.
 * - High z-index (z-[999]) ensuring it floats cleanly above all tables, cards, and modal dialogs.
 * - Supports keyboard navigation (Escape to close).
 * 
 * @param {Object} props
 * @param {string|number} props.value - Currently selected value
 * @param {Function} props.onChange - Callback invoked with new value
 * @param {Array<{value: any, label: string, icon?: any, badge?: string, subtitle?: string}>} props.options - Selectable options
 * @param {string} [props.placeholder='Select...'] - Fallback label when nothing selected
 * @param {string} [props.className=''] - Additional container classes
 * @param {string} [props.buttonClassName=''] - Custom classes for trigger button
 * @param {boolean} [props.disabled=false] - Whether dropdown is disabled
 * @param {'left'|'right'|'auto'} [props.align='auto'] - Horizontal alignment
 */
export const CustomSelect = ({
  value,
  onChange,
  options = [],
  placeholder = 'Select...',
  className = '',
  buttonClassName = '',
  disabled = false,
  align = 'auto',
  id,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [menuAlign, setMenuAlign] = useState(align === 'auto' ? 'left' : align);
  const containerRef = useRef(null);

  // Auto-detect horizontal bounds to avoid off-screen overflow
  useEffect(() => {
    if (isOpen && containerRef.current && align === 'auto') {
      const rect = containerRef.current.getBoundingClientRect();
      const screenWidth = window.innerWidth;
      // If trigger is within 220px of the right edge, align menu to the right
      if (rect.right + 100 > screenWidth) {
        setMenuAlign('right');
      } else {
        setMenuAlign('left');
      }
    }
  }, [isOpen, align]);

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
    <div
      className={`relative ${className} ${isOpen ? 'z-[999]' : 'z-10'}`}
      ref={containerRef}
      id={id ? `${id}-container` : undefined}
    >
      {/* Trigger Button - Always visible, options drop cleanly BELOW it */}
      <button
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full px-3 py-2 text-xs rounded-xl border flex items-center justify-between text-left transition-all duration-150 outline-none ${
          isOpen
            ? 'border-[#F26522] ring-2 ring-orange-500/20 bg-white shadow-xs'
            : 'border-slate-200 hover:border-slate-300 bg-white'
        } ${disabled ? 'opacity-50 cursor-not-allowed bg-slate-50' : 'cursor-pointer'} ${
          selectedOption && selectedOption.value !== '' ? 'text-slate-800 font-semibold' : 'text-slate-600'
        } ${buttonClassName}`}
      >
        <span className="truncate pr-2">{displayLabel}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 flex-shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-[#F26522]' : ''
          }`}
        />
      </button>

      {/* Floating Dropdown Menu - Explicitly positioned DOWNWARDS below button */}
      {isOpen && (
        <div
          className={`absolute top-full mt-1.5 min-w-full w-max max-w-[min(calc(100vw-32px),360px)] bg-white rounded-xl shadow-2xl border border-slate-200/90 py-1.5 z-[1000] max-h-60 overflow-y-auto transition-all ${
            menuAlign === 'right' ? 'right-0' : 'left-0'
          }`}
        >
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
                  <div className="flex flex-col min-w-0 pr-2">
                    <span className="truncate">{option.label}</span>
                    {option.subtitle && (
                      <span className="text-[10px] text-slate-400 font-normal truncate">
                        {option.subtitle}
                      </span>
                    )}
                  </div>
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
