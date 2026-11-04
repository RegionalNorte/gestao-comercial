"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

export type SelectOption = { value: string; label: string };

export function Select({
  name,
  options,
  defaultValue = "",
  placeholder = "Selecione...",
  onChange,
}: {
  name: string;
  options: SelectOption[];
  defaultValue?: string;
  placeholder?: string;
  onChange?: (value: string) => void;
}) {
  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  const selected = options.find((o) => o.value === value);

  return (
    <div ref={rootRef} className="relative">
      <input type="hidden" name={name} value={value} />
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between rounded-md border border-border bg-white px-3 py-2.5 text-left text-[0.9375rem] outline-none transition-colors focus:border-cyan focus:ring-2 focus:ring-cyan/30"
      >
        <span className={selected ? "text-navy" : "text-muted"}>{selected ? selected.label : placeholder}</span>
        <ChevronDown size="1rem" className="shrink-0 text-muted" />
      </button>
      {open ? (
        <ul className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-md border border-border bg-white py-1 shadow-lg">
          {options.map((option) => (
            <li key={option.value}>
              <button
                type="button"
                onClick={() => {
                  setValue(option.value);
                  setOpen(false);
                  onChange?.(option.value);
                }}
                className={`w-full px-3 py-2 text-left text-[0.9375rem] transition-colors hover:bg-cyan/10 ${
                  option.value === value ? "bg-cyan/10 text-cyan-deep" : "text-navy"
                }`}
              >
                {option.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
