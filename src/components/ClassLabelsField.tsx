import React, { useRef, useState } from 'react';
import { X } from 'lucide-react';
import { parseClassLabels } from '../lib/classLabels';

interface ClassLabelsFieldProps {
  // Comma-separated raw value (see src/lib/classLabels.ts) -- this field
  // just renders/edits it as chips, storage format doesn't change.
  value: string;
  onChange: (value: string) => void;
  // Fires once when focus leaves the whole chip/input group (e.g. the user
  // clicked elsewhere on the page) with the fully up-to-date value,
  // including any not-yet-committed typed text -- lets a caller auto-save
  // without re-reading its own (possibly stale) state.
  onBlurAway?: (finalValue: string) => void;
  onCancel?: () => void;
  placeholder?: string;
  autoFocus?: boolean;
  // Smaller chips/input for tight card layouts (the roster grid).
  compact?: boolean;
}

export const ClassLabelsField: React.FC<ClassLabelsFieldProps> = ({
  value,
  onChange,
  onBlurAway,
  onCancel,
  placeholder = '예: 1부',
  autoFocus,
  compact,
}) => {
  const chips = parseClassLabels(value);
  const [draft, setDraft] = useState('');
  // Escape needs the blur it triggers (moving focus away) to NOT also
  // commit/save -- cancelling should discard, not persist.
  const canceledRef = useRef(false);

  const addChip = (text: string) => {
    const trimmed = text.trim();
    if (trimmed && !chips.includes(trimmed)) onChange([...chips, trimmed].join(', '));
    setDraft('');
  };

  const removeChip = (chip: string) => onChange(chips.filter((c) => c !== chip).join(', '));

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addChip(draft);
    } else if (e.key === 'Backspace' && draft === '' && chips.length > 0) {
      removeChip(chips[chips.length - 1]);
    } else if (e.key === 'Escape') {
      canceledRef.current = true;
      onCancel?.();
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    if (canceledRef.current) {
      canceledRef.current = false;
      return;
    }
    const trimmed = draft.trim();
    const finalChips = trimmed && !chips.includes(trimmed) ? [...chips, trimmed] : chips;
    const finalValue = finalChips.join(', ');
    if (trimmed) {
      onChange(finalValue);
      setDraft('');
    }
    onBlurAway?.(finalValue);
  };

  const chipClass = compact
    ? 'inline-flex items-center gap-0.5 pl-1.5 pr-1 py-0.5 rounded bg-[#E8F5E9] text-[#1B5E20] text-[10px] font-bold whitespace-nowrap'
    : 'inline-flex items-center gap-1 pl-2 pr-1.5 py-1 rounded-lg bg-[#E8F5E9] text-[#1B5E20] text-xs font-bold whitespace-nowrap';

  return (
    <div
      onBlur={handleBlur}
      className={`flex flex-wrap items-center gap-1 ${compact ? '' : 'p-2 bg-slate-50 border border-slate-200 rounded-xl'}`}
    >
      {chips.map((chip) => (
        <span key={chip} className={chipClass}>
          <span>{chip}</span>
          <button
            type="button"
            onClick={() => removeChip(chip)}
            className="text-[#1B5E20]/60 hover:text-rose-600 cursor-pointer"
          >
            <X className={compact ? 'w-2.5 h-2.5' : 'w-3 h-3'} />
          </button>
        </span>
      ))}
      <input
        type="text"
        autoFocus={autoFocus}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={chips.length === 0 ? placeholder : '+ 추가'}
        className={
          compact
            ? 'w-14 px-1 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-bold text-slate-900 focus:outline-none focus:border-[#66BB6A]'
            : 'flex-1 min-w-[80px] px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:border-[#66BB6A]'
        }
      />
    </div>
  );
};
