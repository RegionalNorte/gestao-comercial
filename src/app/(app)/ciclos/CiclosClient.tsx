"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SlideOver } from "@/components/SlideOver";
import { CicloForm } from "./CicloForm";
import { criarCiclo, atualizarCiclo } from "./actions";

export type CicloRow = {
  id: string;
  nome: string;
  dataInicio: string | null;
  dataFim: string | null;
  status: string | null;
};

type Drawer = { type: "novo" } | { type: "editar"; ciclo: CicloRow } | null;

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

export function CiclosClient({ ciclos }: { ciclos: CicloRow[] }) {
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
            <h1 className="font-display mt-1 text-2xl font-semibold text-navy">Ciclos</h1>
          </div>
          <button
            type="button"
            onClick={() => setDrawer({ type: "novo" })}
            className="rounded-md bg-navy px-4 py-2.5 text-[0.9375rem] font-medium text-white transition-opacity hover:opacity-90"
          >
            + Novo ciclo
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden px-8 pb-10">
        {ciclos.length === 0 ? (
          <p className="rounded-md border border-border px-5 py-4 text-[0.9375rem] text-muted">
            Nenhum ciclo cadastrado ainda.
          </p>
        ) : (
          <div className="h-full overflow-y-auto rounded-md border border-border">
            <table className="w-full border-separate border-spacing-0 text-left text-[0.875rem]">
              <thead>
                <tr className="sticky top-0 z-10 bg-background text-muted">
                  <th className="border-b border-border px-5 py-2.5 font-medium">Ciclo</th>
                  <th className="border-b border-border px-5 py-2.5 font-medium">Início</th>
                  <th className="border-b border-border px-5 py-2.5 font-medium">Fim</th>
                  <th className="border-b border-border px-5 py-2.5 font-medium">Status</th>
                  <th className="border-b border-border px-5 py-2.5 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {ciclos.map((ciclo) => (
                  <tr key={ciclo.id} className="border-t border-border">
                    <td className="px-5 py-2.5 text-navy">{ciclo.nome}</td>
                    <td className="px-5 py-2.5 text-navy">{formatDate(ciclo.dataInicio)}</td>
                    <td className="px-5 py-2.5 text-navy">{formatDate(ciclo.dataFim)}</td>
                    <td className="px-5 py-2.5 text-navy">{ciclo.status ?? "—"}</td>
                    <td className="px-5 py-2.5 text-right">
                      <button
                        type="button"
                        onClick={() => setDrawer({ type: "editar", ciclo })}
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
        title={drawer?.type === "editar" ? "Editar ciclo" : "Novo ciclo"}
      >
        {drawer?.type === "novo" ? (
          <CicloForm action={criarCiclo} onSuccess={handleSuccess} onCancel={closeDrawer} />
        ) : drawer?.type === "editar" ? (
          <CicloForm
            key={drawer.ciclo.id}
            action={atualizarCiclo.bind(null, drawer.ciclo.id)}
            nomeInicial={drawer.ciclo.nome}
            dataInicioInicial={drawer.ciclo.dataInicio ?? ""}
            dataFimInicial={drawer.ciclo.dataFim ?? ""}
            statusInicial={drawer.ciclo.status ?? "Aberto"}
            onSuccess={handleSuccess}
            onCancel={closeDrawer}
          />
        ) : null}
      </SlideOver>
    </div>
  );
}
