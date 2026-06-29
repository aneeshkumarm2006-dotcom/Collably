'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Check } from 'lucide-react';

import { cn } from '@/lib/utils';

/**
 * Autocomplete — a free-text input with a filtered suggestion dropdown (a
 * combobox). Typing always edits the value (`onValueChange`); picking a
 * suggestion additionally fires `onSelect` so callers can react (e.g. a city
 * auto-filling its region + country). Anything can be typed — the options are
 * suggestions, not a closed set (ported intent from `mobile`'s onboarding
 * autocompletes).
 *
 * Keyboard: ↓/↑ move the active option, Enter selects it, Esc closes. The list
 * also closes on outside-click and blur. ARIA combobox roles keep it accessible.
 */
export interface AutocompleteProps {
  value: string;
  /** Fires on every keystroke (free text). */
  onValueChange: (value: string) => void;
  /** Fires when a suggestion is chosen (click / Enter). Defaults to `onValueChange`. */
  onSelect?: (value: string) => void;
  options: readonly string[];
  placeholder?: string;
  /** Optional leading icon (rendered inside the field). */
  icon?: React.ReactNode;
  /** Max suggestions to show. Default 8. */
  maxItems?: number;
  id?: string;
  name?: string;
  autoComplete?: string;
  disabled?: boolean;
  'aria-invalid'?: boolean;
  'aria-describedby'?: string;
  className?: string;
}

export function Autocomplete({
  value,
  onValueChange,
  onSelect,
  options,
  placeholder,
  icon,
  maxItems = 8,
  id,
  name,
  autoComplete = 'off',
  disabled,
  className,
  ...aria
}: AutocompleteProps) {
  const reactId = useId();
  const inputId = id ?? reactId;
  const listId = `${inputId}-listbox`;

  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  const query = value.trim().toLowerCase();
  const matches = options
    .filter((o) => {
      const lower = o.toLowerCase();
      // Hide an exact match (the field already holds it) to avoid a pointless 1-item list.
      return lower.includes(query) && lower !== query;
    })
    .slice(0, maxItems);
  const showList = open && matches.length > 0;

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  function choose(option: string) {
    (onSelect ?? onValueChange)(option);
    setOpen(false);
    setActive(-1);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!showList) {
      if (e.key === 'ArrowDown') {
        setOpen(true);
        setActive(0);
        e.preventDefault();
      }
      return;
    }
    switch (e.key) {
      case 'ArrowDown':
        setActive((i) => (i + 1) % matches.length);
        e.preventDefault();
        break;
      case 'ArrowUp':
        setActive((i) => (i <= 0 ? matches.length - 1 : i - 1));
        e.preventDefault();
        break;
      case 'Enter':
        if (active >= 0 && active < matches.length) {
          choose(matches[active]);
          e.preventDefault();
        }
        break;
      case 'Escape':
        setOpen(false);
        setActive(-1);
        break;
    }
  }

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-faint [&_svg]:h-4 [&_svg]:w-4">
            {icon}
          </span>
        )}
        <input
          id={inputId}
          name={name}
          type="text"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
          autoComplete={autoComplete}
          disabled={disabled}
          placeholder={placeholder}
          value={value}
          onChange={(e) => {
            onValueChange(e.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          className={cn(
            'flex h-10 w-full rounded-md border border-input bg-card px-3.5 py-2 text-sm text-ink ring-offset-background transition-colors placeholder:text-faint focus-visible:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/25 disabled:cursor-not-allowed disabled:opacity-50',
            icon && 'pl-10',
          )}
          {...aria}
        />
      </div>

      {showList && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-50 mt-1.5 max-h-60 w-full overflow-auto rounded-md border border-hair bg-card p-1 shadow-dropdown"
        >
          {matches.map((option, i) => (
            <li
              key={option}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              // `onMouseDown` (not click) so it fires before the input's blur.
              onMouseDown={(e) => {
                e.preventDefault();
                choose(option);
              }}
              onMouseEnter={() => setActive(i)}
              className={cn(
                'flex cursor-pointer items-center justify-between rounded-sm px-3 py-2 text-sm text-ink',
                i === active ? 'bg-brand-soft text-brand' : 'hover:bg-secondary',
              )}
            >
              <span className="truncate">{option}</span>
              {value.trim().toLowerCase() === option.toLowerCase() && (
                <Check className="h-4 w-4 shrink-0 text-brand" />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
