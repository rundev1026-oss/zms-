'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, Check, X, AlertCircle, LucideIcon } from 'lucide-react';

export interface SearchableSelectOption {
  value: string;
  label: string;
  subLabel?: string;
  badge?: string;
  badgeColor?: 'emerald' | 'teal' | 'blue' | 'amber' | 'purple' | 'slate' | 'rose';
  disabled?: boolean;
}

export interface SearchableSelectProps {
  label?: string;
  options: SearchableSelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  error?: string;
  helperText?: string;
  icon?: LucideIcon;
  disabled?: boolean;
  required?: boolean;
  readOnly?: boolean;
  className?: string;
  id?: string;
}

const BADGE_COLOR_MAP: Record<string, string> = {
  emerald: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  teal: 'bg-teal-100 text-teal-800 border-teal-200',
  blue: 'bg-blue-100 text-blue-800 border-blue-200',
  amber: 'bg-amber-100 text-amber-800 border-amber-200',
  purple: 'bg-purple-100 text-purple-800 border-purple-200',
  slate: 'bg-slate-100 text-slate-800 border-slate-200',
  rose: 'bg-rose-100 text-rose-800 border-rose-200',
};

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  label,
  options,
  value,
  onChange,
  placeholder = 'เลือกรายการ...',
  searchPlaceholder = 'พิมพ์ค้นหา...',
  error,
  helperText,
  icon: Icon,
  disabled = false,
  required = false,
  readOnly = false,
  className = '',
  id,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Find currently selected option
  const selectedOption = useMemo(
    () => options.find((opt) => opt.value === value),
    [options, value]
  );

  // Filter options based on query
  const filteredOptions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return options;
    return options.filter((opt) => {
      const matchLabel = opt.label.toLowerCase().includes(q);
      const matchSub = opt.subLabel ? opt.subLabel.toLowerCase().includes(q) : false;
      const matchBadge = opt.badge ? opt.badge.toLowerCase().includes(q) : false;
      const matchValue = opt.value.toLowerCase().includes(q);
      return matchLabel || matchSub || matchBadge || matchValue;
    });
  }, [options, searchQuery]);

  // Handle outside clicks to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Focus search input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
      setHighlightedIndex(0);
    }
  }, [isOpen]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled || readOnly) return;

    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
      setSearchQuery('');
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev < filteredOptions.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev > 0 ? prev - 1 : filteredOptions.length - 1
      );
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const target = filteredOptions[highlightedIndex];
      if (target && !target.disabled) {
        onChange(target.value);
        setIsOpen(false);
        setSearchQuery('');
      }
    }
  };

  return (
    <div className={`space-y-1.5 relative ${className}`} ref={containerRef}>
      {label && (
        <label
          htmlFor={id}
          className="block text-xs font-bold text-slate-700"
        >
          {label}
          {required && <span className="text-rose-500 ml-1">*</span>}
        </label>
      )}

      {/* Main Trigger Button */}
      <button
        id={id}
        type="button"
        disabled={disabled || readOnly}
        onClick={() => {
          if (!disabled && !readOnly) {
            setIsOpen((prev) => !prev);
          }
        }}
        onKeyDown={handleKeyDown}
        className={`w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border text-left flex items-center justify-between gap-2 transition-all ${
          disabled
            ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
            : readOnly
            ? 'bg-slate-50 border-slate-200 text-slate-800 cursor-default'
            : error
            ? 'bg-rose-50/30 border-rose-400 focus:ring-2 focus:ring-rose-500/30'
            : isOpen
            ? 'bg-white border-teal-600 ring-2 ring-teal-500/20 shadow-xs'
            : 'bg-white border-slate-300 hover:border-slate-400 focus:border-teal-600 focus:ring-2 focus:ring-teal-500/20'
        }`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {Icon && (
            <Icon className="w-4 h-4 text-slate-400 shrink-0" />
          )}

          {selectedOption ? (
            <div className="flex items-center justify-between gap-2 min-w-0 flex-1">
              <div className="min-w-0">
                <span className="text-xs sm:text-sm font-semibold text-slate-900 truncate block">
                  {selectedOption.label}
                </span>
                {selectedOption.subLabel && (
                  <span className="text-[11px] text-slate-500 truncate block">
                    {selectedOption.subLabel}
                  </span>
                )}
              </div>
              {selectedOption.badge && (
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border shrink-0 ${
                    BADGE_COLOR_MAP[selectedOption.badgeColor || 'slate']
                  }`}
                >
                  {selectedOption.badge}
                </span>
              )}
            </div>
          ) : (
            <span className="text-xs sm:text-sm text-slate-400 truncate">
              {placeholder}
            </span>
          )}
        </div>

        {!readOnly && (
          <ChevronDown
            className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-teal-700' : ''
            }`}
          />
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden animate-in fade-in-50 zoom-in-95 duration-150">
          {/* Search Box Header */}
          <div className="p-2 border-b border-slate-100 bg-slate-50/80 sticky top-0">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setHighlightedIndex(0);
                }}
                onKeyDown={handleKeyDown}
                placeholder={searchPlaceholder}
                className="w-full pl-8 pr-7 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="zms-action absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Options List */}
          <div
            ref={listRef}
            role="listbox"
            className="max-h-60 overflow-y-auto p-1.5 space-y-1 divide-y divide-slate-50"
          >
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt, idx) => {
                const isSelected = opt.value === value;
                const isHighlighted = idx === highlightedIndex;

                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    disabled={opt.disabled}
                    onClick={() => {
                      if (!opt.disabled) {
                        onChange(opt.value);
                        setIsOpen(false);
                        setSearchQuery('');
                      }
                    }}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={`w-full min-h-[40px] px-3 py-2 rounded-xl text-left flex items-center justify-between gap-2 transition-colors ${
                      opt.disabled
                        ? 'opacity-40 cursor-not-allowed bg-slate-50'
                        : isSelected
                        ? 'bg-teal-50/80 text-teal-950 font-medium border border-teal-200/60'
                        : isHighlighted
                        ? 'bg-slate-100/80 text-slate-900'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-semibold">{opt.label}</span>
                        {opt.badge && (
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${
                              BADGE_COLOR_MAP[opt.badgeColor || 'slate']
                            }`}
                          >
                            {opt.badge}
                          </span>
                        )}
                      </div>
                      {opt.subLabel && (
                        <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">
                          {opt.subLabel}
                        </p>
                      )}
                    </div>

                    {isSelected && (
                      <Check className="w-4 h-4 text-teal-700 shrink-0" />
                    )}
                  </button>
                );
              })
            ) : (
              <div className="py-6 px-3 text-center text-xs text-slate-400">
                ไม่พบข้อมูลที่ตรงกับคำค้นหา
              </div>
            )}
          </div>
        </div>
      )}

      {error ? (
        <p className="flex items-center gap-1 text-[11px] text-rose-600 mt-1">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </p>
      ) : helperText ? (
        <p className="text-[11px] text-slate-500 mt-1">{helperText}</p>
      ) : null}
    </div>
  );
};

