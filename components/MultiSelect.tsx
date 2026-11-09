"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

export interface MultiSelectOption {
  value: string;
  label: string;
  color?: string;
  selectedBackground?: string;
}

interface MultiSelectProps {
  ariaLabel: string;
  options: MultiSelectOption[];
  selectedValues: string[];
  onToggle: (value: string) => void;
  disabled?: boolean;
  className?: string;
  selectedLabel?: string;
}

export default function MultiSelect({
  ariaLabel,
  options,
  selectedValues,
  onToggle,
  disabled = false,
  className = "",
  selectedLabel,
}: MultiSelectProps) {
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  const isOpen = open && !disabled;

  useEffect(() => {
    if (!isOpen) return;
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen]);

  const selectionText = selectedLabel ?? (
    selectedValues.length === options.length
      ? `All ${ariaLabel.toLowerCase()}`
      : selectedValues.length === 1
        ? options.find(option => option.value === selectedValues[0])?.label ?? "1 selected"
        : `${selectedValues.length} selected`
  );

  return (
    <div ref={root} className="relative min-w-0">
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-controls={id}
        disabled={disabled}
        onClick={() => { if (!disabled) setOpen(value => !value); }}
        className={`mobile-target inline-flex min-h-11 w-full min-w-0 items-center justify-between gap-2 border border-[#2B3A52] bg-[#1A2233] px-3 py-2 text-left font-mono text-xs text-[#9AA8C7] transition-colors enabled:cursor-pointer enabled:hover:border-[#5B8CFF] enabled:hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5B8CFF] disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
      >
        <span className="min-w-0 flex-1 truncate">{selectionText}</span>
        <ChevronDown size={14} aria-hidden className={`shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>
      <div
        id={id}
        role="dialog"
        aria-label={ariaLabel}
        hidden={!isOpen}
        className="absolute left-0 top-[calc(100%+0.35rem)] z-50 w-full min-w-max overflow-hidden border border-[#40546E] bg-[#121826] py-1 text-xs text-[#D4DDF0] shadow-xl shadow-black/30"
      >
        {options.map(option => {
          const checked = selectedValues.includes(option.value);
          return (
            <label key={option.value} style={option.color ? { borderLeftColor: option.color } : undefined} className="flex min-h-10 cursor-pointer items-center gap-2 border-l-2 border-transparent px-3 py-2 transition-colors hover:bg-[#1A2233]">
              <input
                type="checkbox"
                checked={checked}
                onChange={() => onToggle(option.value)}
                className="sr-only"
              />
              <span aria-hidden style={checked && option.color ? { borderColor: option.color, backgroundColor: option.selectedBackground ?? "#20314D" } : undefined} className={`flex size-4 shrink-0 items-center justify-center border ${checked ? "border-[#5B8CFF] bg-[#20314D] text-[#B8D6FF]" : "border-[#52617C] bg-[#121826]"}`}>
                {checked ? <Check size={11} strokeWidth={3} style={option.color ? { color: option.color } : undefined} /> : null}
              </span>
              <span className="whitespace-nowrap" style={option.color ? { color: option.color } : undefined}>{option.label}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
