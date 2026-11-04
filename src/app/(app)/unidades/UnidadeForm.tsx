"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Select } from "@/components/Select";
import type { FormState } from "./actions";

const CLUSTER_OPTIONS = [
  { value: "", label: "Sem cluster" },
  { value: "P", label: "P" },
  { value: "M", label: "M" },
  { value: "G", label: "G" },
];

type AreaOption = { id: string; nome: string };
type GestorOption = { id: string; nome: string; email: string };

export function UnidadeForm({
  action,
  areas,
  gestores,
  gestoresComercial,
  consultores,
  nomeInicial = "",
  areaIdInicial = "",
  clusterInicial = "",
  gestorIdsSelecionados = [],
  gestorComercialIdsSelecionados = [],
  consultorIdsSelecionados = [],
  onSuccess,
  onCancel,
}: {
  action: (prevState: FormState, formData: FormData) => Promise<FormState>;
  areas: AreaOption[];
  gestores: GestorOption[];
  gestoresComercial: GestorOption[];
  consultores: GestorOption[];
  nomeInicial?: string;
  areaIdInicial?: string;
  clusterInicial?: string;
  gestorIdsSelecionados?: string[];
  gestorComercialIdsSelecionados?: string[];
  consultorIdsSelecionados?: string[];
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [state, formAction, isPending] = useActionState(action, undefined);
  const wasPending = useRef(false);
  const [formKey, setFormKey] = useState(0);

  useEffect(() => {
    if (wasPending.current && !isPending) {
      if (!state?.error) {
        onSuccess();
      } else {
        // Força o <form> a remontar para repopular os campos com o que foi
        // digitado/marcado (via state.values/gestorIds), já que o React reseta
        // inputs não controlados depois que a action roda — mesmo em caso de erro.
        setFormKey((k) => k + 1);
      }
    }
    wasPending.current = isPending;
  }, [isPending, state, onSuccess]);

  const valores = state?.values;
  const gestorIdsAtuais = state?.gestorIds ?? gestorIdsSelecionados;
  const gestorComercialIdsAtuais = state?.gestorComercialIds ?? gestorComercialIdsSelecionados;
  const consultorIdsAtuais = state?.consultorIds ?? consultorIdsSelecionados;

  return (
    <form key={formKey} action={formAction} className="w-full space-y-6" noValidate>
      <div className="space-y-1.5">
        <label htmlFor="nome" className="block text-sm font-medium text-navy">
          Nome da unidade
        </label>
        <input
          id="nome"
          name="nome"
          type="text"
          required
          defaultValue={valores?.nome ?? nomeInicial}
          className="w-full rounded-md border border-border bg-white px-3 py-2.5 text-[0.9375rem] text-navy outline-none transition-colors focus:border-cyan focus:ring-2 focus:ring-cyan/30"
          placeholder="Ex.: Boa Vista"
        />
      </div>

      <div className="space-y-1.5">
        <p className="block text-sm font-medium text-navy">Área</p>
        <Select
          name="areaId"
          options={areas.map((a) => ({ value: a.id, label: a.nome }))}
          defaultValue={valores?.areaId ?? areaIdInicial}
        />
      </div>

      <div className="space-y-1.5">
        <p className="block text-sm font-medium text-navy">Cluster</p>
        <Select name="cluster" options={CLUSTER_OPTIONS} defaultValue={valores?.cluster ?? clusterInicial} />
      </div>

      <div className="space-y-1.5">
        <p className="block text-sm font-medium text-navy">Gerente(s) de Unidade</p>
        {gestores.length === 0 ? (
          <p className="text-[0.8125rem] text-muted">
            Nenhum usuário com perfil &quot;Gerente de Unidade&quot; cadastrado ainda. Cadastre em{" "}
            <Link href="/usuarios" className="text-cyan-deep underline">
              Usuários
            </Link>
            .
          </p>
        ) : (
          <div className="space-y-1.5 rounded-md border border-border p-3">
            {gestores.map((g) => (
              <label key={g.id} className="flex items-center gap-2 text-[0.9375rem] text-navy">
                <input
                  type="checkbox"
                  name="gestores"
                  value={g.id}
                  defaultChecked={gestorIdsAtuais.includes(g.id)}
                  className="accent-cyan"
                />
                {g.nome} <span className="text-muted">({g.email})</span>
              </label>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        <p className="block text-sm font-medium text-navy">Gerente(s) Comercial(is)</p>
        {gestoresComercial.length === 0 ? (
          <p className="text-[0.8125rem] text-muted">
            Nenhum usuário com perfil &quot;Gerente Comercial&quot; cadastrado ainda. Cadastre em{" "}
            <Link href="/usuarios" className="text-cyan-deep underline">
              Usuários
            </Link>
            .
          </p>
        ) : (
          <div className="space-y-1.5 rounded-md border border-border p-3">
            {gestoresComercial.map((g) => (
              <label key={g.id} className="flex items-center gap-2 text-[0.9375rem] text-navy">
                <input
                  type="checkbox"
                  name="gestoresComercial"
                  value={g.id}
                  defaultChecked={gestorComercialIdsAtuais.includes(g.id)}
                  className="accent-cyan"
                />
                {g.nome} <span className="text-muted">({g.email})</span>
              </label>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        <p className="block text-sm font-medium text-navy">Consultor(es)</p>
        {consultores.length === 0 ? (
          <p className="text-[0.8125rem] text-muted">
            Nenhum usuário com perfil &quot;Consultor&quot; cadastrado ainda. Cadastre em{" "}
            <Link href="/usuarios" className="text-cyan-deep underline">
              Usuários
            </Link>
            .
          </p>
        ) : (
          <div className="space-y-1.5 rounded-md border border-border p-3">
            {consultores.map((c) => (
              <label key={c.id} className="flex items-center gap-2 text-[0.9375rem] text-navy">
                <input
                  type="checkbox"
                  name="consultores"
                  value={c.id}
                  defaultChecked={consultorIdsAtuais.includes(c.id)}
                  className="accent-cyan"
                />
                {c.nome} <span className="text-muted">({c.email})</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {state?.error ? (
        <p role="alert" className="text-sm text-error">
          {state.error}
        </p>
      ) : null}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-navy px-4 py-2.5 text-[0.9375rem] font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isPending ? "Salvando..." : "Salvar"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="text-[0.9375rem] text-muted hover:text-navy"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
