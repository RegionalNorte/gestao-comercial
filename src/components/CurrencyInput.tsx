"use client";

import { useState } from "react";

function formatMilhar(raw: string): string {
  const limpo = raw.replace(/[^\d,]/g, "");
  const [intParte, ...resto] = limpo.split(",");
  const decParte = resto.length > 0 ? resto.join("") : undefined;
  const intFormatado = intParte.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return decParte !== undefined ? `${intFormatado},${decParte}` : intFormatado;
}

function paraValorPlano(formatado: string): string {
  return formatado.replace(/\./g, "").replace(",", ".");
}

function paraDisplay(valorPlano: string): string {
  if (!valorPlano) return "";
  const [intParte, decParte] = valorPlano.split(".");
  const intFormatado = intParte.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return decParte !== undefined ? `${intFormatado},${decParte}` : intFormatado;
}

export function CurrencyInput({
  id,
  name,
  defaultValue = "",
  onValueChange,
  placeholder,
  required,
}: {
  id?: string;
  name: string;
  defaultValue?: string;
  onValueChange?: (valorPlano: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  const [display, setDisplay] = useState(() => paraDisplay(defaultValue));

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const novo = formatMilhar(e.target.value);
    setDisplay(novo);
    onValueChange?.(paraValorPlano(novo));
  }

  return (
    <>
      <input
        id={id}
        type="text"
        inputMode="decimal"
        required={required}
        value={display}
        onChange={handleChange}
        placeholder={placeholder}
        className="w-full rounded-md border border-border bg-white px-3 py-2.5 text-[0.9375rem] text-navy outline-none transition-colors focus:border-cyan focus:ring-2 focus:ring-cyan/30"
      />
      <input type="hidden" name={name} value={paraValorPlano(display)} />
    </>
  );
}
