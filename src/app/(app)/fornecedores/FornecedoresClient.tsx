"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SlideOver } from "@/components/SlideOver";
import { FornecedorForm } from "./FornecedorForm";
import { criarFornecedor, atualizarFornecedor } from "./actions";

export type FornecedorRow = {
  id: string;
  nome: string;
  abreviacao: string | null;
  codFornecedor: string | null;
  contaContabil: string | null;
  bvPct: number | null;
  taxaPct: number | null;
};

type Drawer = { type: "novo" } | { type: "editar"; fornecedor: FornecedorRow } | null;

function formatPct(value: number | null): string {
  if (value === null) return "—";
  return `${(value * 100).toFixed(2).replace(/\.?0+$/, "")}%`;
}

export function FornecedoresClient({ fornecedores }: { fornecedores: FornecedorRow[] }) {
  const router = useRouter();
  const [drawer, setDrawer] = useState<Drawer>(null);

  function closeDrawer() {
    setDrawer(null);
  }

  function handleSuccess() {
    setDrawer(null);
    router.refresh();
  }

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 px-8 pt-10 pb-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted">Cadastros</p>
            <h1 className="font-display mt-1 text-2xl font-semibold text-navy">Fornecedores</h1>
          </div>
          <button
            type="button"
            onClick={() => setDrawer({ type: "novo" })}
            className="rounded-md bg-navy px-4 py-2.5 text-[0.9375rem] font-medium text-white transition-opacity hover:opacity-90"
          >
            + Novo fornecedor
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden px-8 pb-10">
        {fornecedores.length === 0 ? (
          <p className="rounded-md border border-border px-5 py-4 text-[0.9375rem] text-muted">
            Nenhum fornecedor cadastrado ainda.
          </p>
        ) : (
          <div className="h-full overflow-y-auto rounded-md border border-border">
            <table className="w-full border-separate border-spacing-0 text-left text-[0.875rem]">
              <thead>
                <tr className="sticky top-0 z-10 bg-background text-muted">
                  <th className="border-b border-border px-5 py-2.5 font-medium">Fornecedor</th>
                  <th className="border-b border-border px-5 py-2.5 font-medium">Abreviação</th>
                  <th className="border-b border-border px-5 py-2.5 font-medium">Código</th>
                  <th className="border-b border-border px-5 py-2.5 font-medium">Conta contábil</th>
                  <th className="border-b border-border px-5 py-2.5 font-medium">BV%</th>
                  <th className="border-b border-border px-5 py-2.5 font-medium">Taxa%</th>
                  <th className="border-b border-border px-5 py-2.5 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {fornecedores.map((fornecedor) => (
                  <tr key={fornecedor.id} className="border-t border-border">
                    <td className="px-5 py-2.5 text-navy">{fornecedor.nome}</td>
                    <td className="px-5 py-2.5 text-navy">{fornecedor.abreviacao ?? "—"}</td>
                    <td className="px-5 py-2.5 text-navy">{fornecedor.codFornecedor ?? "—"}</td>
                    <td className="px-5 py-2.5 text-navy">{fornecedor.contaContabil ?? "—"}</td>
                    <td className="px-5 py-2.5 text-navy">{formatPct(fornecedor.bvPct)}</td>
                    <td className="px-5 py-2.5 text-navy">{formatPct(fornecedor.taxaPct)}</td>
                    <td className="px-5 py-2.5 text-right">
                      <button
                        type="button"
                        onClick={() => setDrawer({ type: "editar", fornecedor })}
                        className="text-cyan-deep hover:underline"
                      >
                        Editar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <SlideOver
        open={drawer?.type === "novo" || drawer?.type === "editar"}
        onClose={closeDrawer}
        title={drawer?.type === "editar" ? "Editar fornecedor" : "Novo fornecedor"}
      >
        {drawer?.type === "novo" ? (
          <FornecedorForm action={criarFornecedor} onSuccess={handleSuccess} onCancel={closeDrawer} />
        ) : drawer?.type === "editar" ? (
          <FornecedorForm
            key={drawer.fornecedor.id}
            action={atualizarFornecedor.bind(null, drawer.fornecedor.id)}
            nomeInicial={drawer.fornecedor.nome}
            abreviacaoInicial={drawer.fornecedor.abreviacao ?? ""}
            codFornecedorInicial={drawer.fornecedor.codFornecedor ?? ""}
            contaContabilInicial={drawer.fornecedor.contaContabil ?? ""}
            bvPctInicial={drawer.fornecedor.bvPct !== null ? String(drawer.fornecedor.bvPct * 100) : ""}
            taxaPctInicial={drawer.fornecedor.taxaPct !== null ? String(drawer.fornecedor.taxaPct * 100) : ""}
            onSuccess={handleSuccess}
            onCancel={closeDrawer}
          />
        ) : null}
      </SlideOver>
    </div>
  );
}
