"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SlideOver } from "@/components/SlideOver";
import { AreaForm } from "./AreaForm";
import { UnidadeForm } from "./UnidadeForm";
import { criarArea, atualizarArea, criarUnidade, atualizarUnidade } from "./actions";

type GestorOption = { id: string; nome: string; email: string };
type AreaOption = { id: string; nome: string };

export type AreaData = {
  id: string;
  nome: string;
  gestorNomes: string[];
  gestorIds: string[];
};

export type UnidadeRow = {
  id: string;
  nome: string;
  cluster: string | null;
  areaId: string;
  areaNome: string;
  gestorNomes: string[];
  gestorIds: string[];
  gestorComercialNomes: string[];
  gestorComercialIds: string[];
};

type Drawer =
  | { type: "areas-lista" }
  | { type: "nova-area" }
  | { type: "editar-area"; area: AreaData }
  | { type: "nova-unidade" }
  | { type: "editar-unidade"; unidade: UnidadeRow }
  | null;

export function UnidadesClient({
  areas,
  unidades,
  gestoresArea,
  gestoresUnidade,
  gestoresComercial,
}: {
  areas: AreaData[];
  unidades: UnidadeRow[];
  gestoresArea: GestorOption[];
  gestoresUnidade: GestorOption[];
  gestoresComercial: GestorOption[];
}) {
  const router = useRouter();
  const [drawer, setDrawer] = useState<Drawer>(null);

  const areaOptions: AreaOption[] = areas.map((a) => ({ id: a.id, nome: a.nome }));

  function closeDrawer() {
    setDrawer(null);
  }

  function handleSuccess() {
    setDrawer(null);
    router.refresh();
  }

  function voltarParaAreas() {
    setDrawer({ type: "areas-lista" });
  }

  function handleAreaFormSuccess() {
    setDrawer({ type: "areas-lista" });
    router.refresh();
  }

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 px-8 pt-10 pb-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted">Cadastros</p>
            <h1 className="font-display mt-1 text-2xl font-semibold text-navy">Unidades</h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setDrawer({ type: "areas-lista" })}
              className="rounded-md border border-navy px-4 py-2.5 text-[0.9375rem] font-medium text-navy transition-colors hover:bg-navy/10"
            >
              Áreas
            </button>
            <button
              type="button"
              onClick={() => setDrawer({ type: "nova-unidade" })}
              className="rounded-md bg-navy px-4 py-2.5 text-[0.9375rem] font-medium text-white transition-opacity hover:opacity-90"
            >
              + Nova unidade
            </button>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden px-8 pb-10">
        {unidades.length === 0 ? (
          <p className="rounded-md border border-border px-5 py-4 text-[0.9375rem] text-muted">
            Nenhuma unidade cadastrada ainda.
          </p>
        ) : (
          <div className="h-full overflow-y-auto rounded-md border border-border">
            <table className="w-full border-separate border-spacing-0 text-left text-[0.875rem]">
              <thead>
                <tr className="sticky top-0 z-10 bg-background text-muted">
                  <th className="border-b border-border px-5 py-2.5 font-medium">Área</th>
                  <th className="border-b border-border px-5 py-2.5 font-medium">Unidade</th>
                  <th className="border-b border-border px-5 py-2.5 font-medium">Cluster</th>
                  <th className="border-b border-border px-5 py-2.5 font-medium">Gerente de Unidade</th>
                  <th className="border-b border-border px-5 py-2.5 font-medium">Gerente Comercial</th>
                  <th className="border-b border-border px-5 py-2.5 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {unidades.map((unidade) => (
                  <tr key={unidade.id} className="border-t border-border">
                    <td className="px-5 py-2.5 text-navy">{unidade.areaNome}</td>
                    <td className="px-5 py-2.5 text-navy">{unidade.nome}</td>
                    <td className="px-5 py-2.5 text-navy">{unidade.cluster ?? "—"}</td>
                    <td className="px-5 py-2.5 text-navy">
                      {unidade.gestorNomes.length > 0 ? unidade.gestorNomes.join(", ") : "—"}
                    </td>
                    <td className="px-5 py-2.5 text-navy">
                      {unidade.gestorComercialNomes.length > 0 ? unidade.gestorComercialNomes.join(", ") : "—"}
                    </td>
                    <td className="px-5 py-2.5 text-right">
                      <button
                        type="button"
                        onClick={() => setDrawer({ type: "editar-unidade", unidade })}
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
        open={drawer?.type === "areas-lista" || drawer?.type === "nova-area" || drawer?.type === "editar-area"}
        onClose={closeDrawer}
        title={
          drawer?.type === "editar-area" ? "Editar área" : drawer?.type === "nova-area" ? "Nova área" : "Áreas"
        }
      >
        {drawer?.type === "areas-lista" ? (
          <div className="space-y-5">
            <button
              type="button"
              onClick={() => setDrawer({ type: "nova-area" })}
              className="rounded-md border border-navy px-4 py-2.5 text-[0.9375rem] font-medium text-navy transition-colors hover:bg-navy/10"
            >
              + Nova área
            </button>
            {areas.length === 0 ? (
              <p className="text-[0.9375rem] text-muted">Nenhuma área cadastrada ainda.</p>
            ) : (
              <div className="divide-y divide-border rounded-md border border-border">
                {areas.map((area) => (
                  <div key={area.id} className="flex items-center justify-between px-4 py-3">
                    <span className="text-[0.9375rem] text-navy">{area.nome}</span>
                    <button
                      type="button"
                      onClick={() => setDrawer({ type: "editar-area", area })}
                      className="text-cyan-deep hover:underline"
                    >
                      Editar
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : drawer?.type === "nova-area" ? (
          <AreaForm
            action={criarArea}
            gestores={gestoresArea}
            onSuccess={handleAreaFormSuccess}
            onCancel={voltarParaAreas}
          />
        ) : drawer?.type === "editar-area" ? (
          <AreaForm
            key={drawer.area.id}
            action={atualizarArea.bind(null, drawer.area.id)}
            nomeInicial={drawer.area.nome}
            gestores={gestoresArea}
            gestorIdsSelecionados={drawer.area.gestorIds}
            onSuccess={handleAreaFormSuccess}
            onCancel={voltarParaAreas}
          />
        ) : null}
      </SlideOver>

      <SlideOver
        open={drawer?.type === "nova-unidade" || drawer?.type === "editar-unidade"}
        onClose={closeDrawer}
        title={drawer?.type === "editar-unidade" ? "Editar unidade" : "Nova unidade"}
      >
        {drawer?.type === "nova-unidade" ? (
          <UnidadeForm
            action={criarUnidade}
            areas={areaOptions}
            gestores={gestoresUnidade}
            gestoresComercial={gestoresComercial}
            onSuccess={handleSuccess}
            onCancel={closeDrawer}
          />
        ) : drawer?.type === "editar-unidade" ? (
          <UnidadeForm
            key={drawer.unidade.id}
            action={atualizarUnidade.bind(null, drawer.unidade.id)}
            areas={areaOptions}
            gestores={gestoresUnidade}
            gestoresComercial={gestoresComercial}
            nomeInicial={drawer.unidade.nome}
            areaIdInicial={drawer.unidade.areaId}
            clusterInicial={drawer.unidade.cluster ?? ""}
            gestorIdsSelecionados={drawer.unidade.gestorIds}
            gestorComercialIdsSelecionados={drawer.unidade.gestorComercialIds}
            onSuccess={handleSuccess}
            onCancel={closeDrawer}
          />
        ) : null}
      </SlideOver>
    </div>
  );
}
