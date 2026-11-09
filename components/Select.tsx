"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { Check, ChevronDown } from "lucide-react";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps {
  id?: string;
  ariaLabel: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  wrapperClassName?: string;
  placeholder?: string;
}

export default function Select({
  id,
  ariaLabel,
  value,
  options,
  onChange,
  disabled = false,
  className = "",
  wrapperClassName = "",
  placeholder = "Choose an option",
}: SelectProps) {
  const generatedId = useId();
  const listboxId = `${generatedId}-listbox`;
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [query, setQuery] = useState("");
  const [menuWidth, setMenuWidth] = useState<number>();
  const [minimumWidth, setMinimumWidth] = useState<number>();
  const queryTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const selectedIndex = options.findIndex(option => option.value === value && !option.disabled);
  const selected = options.find(option => option.value === value);

  useEffect(() => () => clearTimeout(queryTimer.current), []);
  useEffect(() => {
    const measureWidths = () => {
      const listbox = root.current?.querySelector<HTMLElement>('[role="listbox"]');
      const button = trigger.current;
      if (!listbox || !button) return;
      const menuStyle = window.getComputedStyle(listbox);
      const buttonStyle = window.getComputedStyle(button);
      const context = document.createElement("canvas").getContext("2d");
      if (!context) return;
      const labels = [placeholder, value, ...options.map(option => option.label)];
      const measureLongest = (style: CSSStyleDeclaration) => {
        context.font = `${style.fontStyle} ${style.fontVariant} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
        return Math.max(0, ...labels.map(label => context.measureText(label).width));
      };
      const menuTextWidth = measureLongest(menuStyle);
      const buttonTextWidth = measureLongest(buttonStyle);
      // Fit full menu labels plus the check, gaps and padding, and also fit
      // the selected label at the trigger's (sometimes larger) font size.
      const menuWidth = menuTextWidth + 13 + 8 + 24 + 2 + 8;
      const triggerWidth = buttonTextWidth + 14 + 8 +
        Number.parseFloat(buttonStyle.paddingLeft) + Number.parseFloat(buttonStyle.paddingRight) +
        Number.parseFloat(buttonStyle.borderLeftWidth) + Number.parseFloat(buttonStyle.borderRightWidth);
      const width = Math.ceil(Math.max(menuWidth, triggerWidth));
      setMinimumWidth(current => current === width ? current : width);
    };
    measureWidths();
    window.addEventListener("resize", measureWidths);
    return () => window.removeEventListener("resize", measureWidths);
  }, [options, placeholder, value, className]);
  useEffect(() => {
    if (!open) return;
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const updateMenuWidth = () => {
      const width = trigger.current?.getBoundingClientRect().width;
      if (width) setMenuWidth(width);
    };
    updateMenuWidth();
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    window.addEventListener("resize", updateMenuWidth);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      window.removeEventListener("resize", updateMenuWidth);
    };
  }, [open]);

  const firstEnabled = (from: number, direction: 1 | -1) => {
    if (!options.length) return -1;
    for (let step = 0; step < options.length; step++) {
      const index = (from + step * direction + options.length) % options.length;
      if (!options[index].disabled) return index;
    }
    return -1;
  };

  const openAt = (index: number) => {
    const start = index >= 0 ? index : 0;
    const width = trigger.current?.getBoundingClientRect().width;
    if (width) setMenuWidth(width);
    setActiveIndex(firstEnabled(start, 1));
    setOpen(true);
  };

  const choose = (index: number) => {
    const option = options[index];
    if (!option || option.disabled) return;
    onChange(option.value);
    setOpen(false);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const direction = event.key === "ArrowDown" ? 1 : -1;
      if (!open) openAt(selectedIndex >= 0 ? selectedIndex : direction === 1 ? 0 : options.length - 1);
      else setActiveIndex(index => firstEnabled((index + direction + options.length) % options.length, direction));
      return;
    }
    if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      setActiveIndex(firstEnabled(event.key === "Home" ? 0 : options.length - 1, event.key === "Home" ? 1 : -1));
      setOpen(true);
      return;
    }
    if (event.key === "Escape") {
      if (open) {
        event.preventDefault();
        setOpen(false);
      }
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (open) choose(activeIndex);
      else openAt(selectedIndex);
      return;
    }
    if (event.key === "Tab") {
      setOpen(false);
      return;
    }
    if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      const nextQuery = `${query}${event.key}`.toLocaleLowerCase();
      setQuery(nextQuery);
      clearTimeout(queryTimer.current);
      queryTimer.current = setTimeout(() => setQuery(""), 700);
      const match = options.findIndex(option => !option.disabled && option.label.toLocaleLowerCase().startsWith(nextQuery));
      if (match >= 0) {
        event.preventDefault();
        setActiveIndex(match);
        setOpen(true);
      }
    }
  };

  return (
    <div ref={root} className={`relative min-w-0 ${wrapperClassName}`}>
      <button
        ref={trigger}
        id={id}
        type="button"
        role="combobox"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-activedescendant={open && activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined}
        disabled={disabled}
        onClick={() => open ? setOpen(false) : openAt(selectedIndex)}
        onKeyDown={handleKeyDown}
        style={minimumWidth ? { minWidth: minimumWidth } : undefined}
        className={`inline-flex items-center justify-between gap-2 text-left ${className}`}
      >
        <span className="min-w-0 flex-1 truncate">{selected?.label ?? (value || placeholder)}</span>
        <ChevronDown size={14} aria-hidden className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      <div
        id={listboxId}
        role="listbox"
        aria-label={ariaLabel}
        hidden={!open}
        style={menuWidth ? { width: menuWidth } : undefined}
        className="absolute left-0 top-[calc(100%+0.35rem)] z-50 box-border max-h-64 overflow-x-hidden overflow-y-auto border border-[#40546E] bg-[#121826] py-1 text-xs text-[#D4DDF0] shadow-xl shadow-black/30"
      >
        {options.map((option, index) => {
          const active = index === activeIndex;
          const isSelected = option.value === value;
          return (
            <div
              id={`${listboxId}-option-${index}`}
              key={`${option.value}-${index}`}
              role="option"
              aria-selected={isSelected}
              aria-disabled={option.disabled || undefined}
              onMouseDown={event => event.preventDefault()}
              onMouseEnter={() => !option.disabled && setActiveIndex(index)}
              onClick={() => choose(index)}
              className={`flex min-h-10 cursor-pointer items-center gap-2 px-3 py-2 transition-colors ${
                option.disabled ? "cursor-not-allowed opacity-40" : active ? "bg-[#20314D] text-[#B8D6FF]" : "hover:bg-[#1A2233]"
              }`}
            >
              <Check size={13} aria-hidden className={`shrink-0 ${isSelected ? "opacity-100 text-[#62D6A7]" : "opacity-0"}`} />
              <span className="min-w-0 flex-1 whitespace-nowrap">{option.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
