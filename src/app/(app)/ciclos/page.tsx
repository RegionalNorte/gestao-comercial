import { prisma } from "@/lib/prisma";
import { requirePerfil } from "@/lib/auth";
import { CiclosClient, type CicloRow } from "./CiclosClient";

function toIsoDate(d: Date | null): string | null {
  if (!d) return null;
  return d.toISOString().slice(0, 10);
}

export default async function CiclosPage() {
  await requirePerfil(["ADMIN", "ANALISTA"]);

  const ciclosRaw = await prisma.ciclo.findMany({ orderBy: { nome: "asc" } });

  const ciclos: CicloRow[] = ciclosRaw.map((c) => ({
    id: c.id,
    nome: c.nome,
    dataInicio: toIsoDate(c.dataInicio),
    dataFim: toIsoDate(c.dataFim),
    status: c.status,
  }));

  return <CiclosClient ciclos={ciclos} />;
}
