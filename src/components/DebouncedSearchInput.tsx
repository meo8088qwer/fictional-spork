import React, { useEffect, useState } from 'react';

interface DebouncedSearchInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  delayMs?: number;
}

/**
 * A search box whose typing never re-renders whatever expensive thing it
 * filters (a 100+ row table, a full leaderboard) on every keystroke.
 *
 * Typed characters update this component's own local state instantly, so
 * the input never feels laggy; only after `delayMs` of no typing does the
 * parent's `value` actually change, which is when the parent re-filters and
 * re-renders its (possibly large) list.
 *
 * This isn't just a performance nicety: measured against a 100-student
 * roster, re-rendering the parent (and its whole table) on every keystroke
 * blocked the main thread for 100-300ms per character, which is long
 * enough to plausibly break the browser's Korean IME composition mid-word
 * (reported as "이름 검색하고 지우고 다시 검색하면 영어로 바뀌어요").
 * Isolating the raw keystroke state in this small component means typing
 * only ever re-renders this one `<input>`, not the parent.
 */
export const DebouncedSearchInput = React.forwardRef<HTMLInputElement, DebouncedSearchInputProps>(
  ({ value, onChange, delayMs = 200, ...inputProps }, ref) => {
    const [local, setLocal] = useState(value);

    // Stay in sync when the parent resets the value itself (e.g. a CLEAR
    // button, or switching tabs/filters that clear the search).
    useEffect(() => {
      setLocal(value);
    }, [value]);

    useEffect(() => {
      const timer = setTimeout(() => onChange(local), delayMs);
      return () => clearTimeout(timer);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [local, delayMs]);

    return (
      <input
        ref={ref}
        lang="ko"
        {...inputProps}
        value={local}
        onChange={(e) => setLocal(e.target.value)}
      />
    );
  }
);

DebouncedSearchInput.displayName = 'DebouncedSearchInput';
