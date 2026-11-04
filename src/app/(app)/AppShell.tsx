"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ChevronDown, PanelLeftClose, PanelLeftOpen, LogOut } from "lucide-react";
import { NAV_ITEMS } from "./nav-items";
import { logout } from "../logout-action";
import type { Perfil } from "../../generated/prisma";

const PERFIL_LABEL: Record<Perfil, string> = {
  ADMIN: "Admin",
  ANALISTA: "Analista",
  GERENTE_REGIONAL: "Gerente Regional",
  GERENTE_AREA: "Gerente de Área",
  GERENTE_UNIDADE: "Gerente de Unidade",
  GERENTE_COMERCIAL: "Gerente Comercial",
  CONSULTOR: "Consultor",
};

export function AppShell({
  nome,
  perfil,
  children,
}: {
  nome: string;
  perfil: Perfil;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  const entries = NAV_ITEMS.map((entry) =>
    entry.type === "group"
      ? { ...entry, items: entry.items.filter((item) => item.perfis.includes(perfil)) }
      : entry,
  ).filter((entry) => (entry.type === "group" ? entry.items.length > 0 : entry.perfis.includes(perfil)));

  // Abre automaticamente o grupo que contém a rota atual; a partir daí o
  // usuário controla livremente (abrir/fechar) com o clique no cabeçalho.
  const [openGroups, setOpenGroups] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    for (const entry of entries) {
      if (entry.type === "group" && entry.items.some((item) => pathname.startsWith(item.href))) {
        initial.add(entry.label);
      }
    }
    return initial;
  });

  function toggleGroup(label: string) {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <aside
        className={`flex shrink-0 flex-col bg-navy transition-[width] duration-200 ${
          collapsed ? "w-[4.25rem]" : "w-64"
        }`}
      >
        <div className="flex items-center gap-2 px-4 py-5">
          <svg viewBox="0 0 32 32" className="h-7 w-7 shrink-0" aria-hidden="true">
            <defs>
              <linearGradient id="logoC" x1="16" y1="4" x2="16" y2="28" gradientUnits="userSpaceOnUse">
                <stop offset="0" stopColor="#00b0f0" />
                <stop offset="1" stopColor="#92d050" />
              </linearGradient>
            </defs>
            <path
              d="M 24.19 21.74 A 10 10 0 1 1 24.19 10.26"
              fill="none"
              stroke="url(#logoC)"
              strokeWidth={7}
              strokeLinecap="round"
            />
          </svg>
          {!collapsed && (
            <span className="font-display truncate text-[1.0625rem] font-semibold text-white">
              Gestão Comercial
            </span>
          )}
        </div>

        <nav className="flex-1 space-y-0.5 px-2">
          {entries.map((entry) => {
            if (entry.type === "group") {
              const GroupIcon = entry.icon;
              const groupActive = entry.items.some((item) => pathname.startsWith(item.href));
              const open = openGroups.has(entry.label);

              // Colapsado: o cabeçalho não é clicável (não navega e não há espaço pro
              // rótulo); os itens só aparecem num flyout ao passar o mouse, pra não
              // empilhar tudo aberto na barra.
              if (collapsed) {
                return (
                  <div key={entry.label} className="group relative">
                    <div
                      title={entry.label}
                      className={`flex items-center justify-center rounded-md px-3 py-2.5 text-sm transition-colors ${
                        groupActive
                          ? "bg-white/10 font-medium text-white"
                          : "text-white/70 group-hover:bg-white/5 group-hover:text-white"
                      }`}
                    >
                      <GroupIcon size="1.125rem" className="shrink-0" />
                    </div>
                    <div className="invisible absolute left-full top-0 z-50 ml-1 w-56 rounded-md bg-navy p-1 opacity-0 shadow-lg transition-opacity group-hover:visible group-hover:opacity-100">
                      <p className="truncate px-3 py-2 text-sm font-medium text-white/60">{entry.label}</p>
                      {entry.items.map((item) => {
                        const active = pathname.startsWith(item.href);
                        const Icon = item.icon;
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors ${
                              active
                                ? "bg-white/10 font-medium text-white"
                                : "text-white/70 hover:bg-white/5 hover:text-white"
                            }`}
                          >
                            <Icon size="1.125rem" className="shrink-0" />
                            <span className="truncate">{item.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                );
              }

              return (
                <div key={entry.label}>
                  <button
                    type="button"
                    onClick={() => toggleGroup(entry.label)}
                    className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors ${
                      groupActive && !open
                        ? "bg-white/10 font-medium text-white"
                        : "text-white/70 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <GroupIcon size="1.125rem" className="shrink-0" />
                    <span className="flex-1 truncate text-left">{entry.label}</span>
                    <ChevronDown
                      size="1rem"
                      className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
                    />
                  </button>
                  {open && (
                    <div className="mt-0.5 space-y-0.5 border-l border-white/10 pl-3">
                      {entry.items.map((item) => {
                        const active = pathname.startsWith(item.href);
                        const Icon = item.icon;
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors ${
                              active
                                ? "bg-white/10 font-medium text-white"
                                : "text-white/70 hover:bg-white/5 hover:text-white"
                            }`}
                          >
                            <Icon size="1.125rem" className="shrink-0" />
                            <span className="truncate">{item.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            const active = entry.href === "/" ? pathname === "/" : pathname.startsWith(entry.href);
            const Icon = entry.icon;
            return (
              <Link
                key={entry.href}
                href={entry.href}
                title={collapsed ? entry.label : undefined}
                className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors ${
                  active
                    ? "bg-white/10 font-medium text-white"
                    : "text-white/70 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Icon size="1.125rem" className="shrink-0" />
                {!collapsed && <span className="truncate">{entry.label}</span>}
              </Link>
            );
          })}
        </nav>

        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className="mx-2 mb-2 flex items-center gap-3 rounded-md px-3 py-2.5 text-sm text-white/70 transition-colors hover:bg-white/5 hover:text-white"
        >
          {collapsed ? <PanelLeftOpen size="1.125rem" /> : <PanelLeftClose size="1.125rem" />}
          {!collapsed && <span>Recolher</span>}
        </button>

        <div className="border-t border-white/10 px-2 py-3">
          {!collapsed && (
            <div className="px-3 pb-2">
              <p className="truncate text-sm font-medium text-white">{nome}</p>
              <p className="text-[0.8125rem] text-white/60">{PERFIL_LABEL[perfil]}</p>
            </div>
          )}
          <form action={logout}>
            <button
              type="submit"
              title={collapsed ? "Sair" : undefined}
              className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm text-white/70 transition-colors hover:bg-white/5 hover:text-white"
            >
              <LogOut size="1.125rem" className="shrink-0" />
              {!collapsed && <span>Sair</span>}
            </button>
          </form>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto bg-white">{children}</main>
    </div>
  );
}
