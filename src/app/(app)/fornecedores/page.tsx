import { prisma } from "@/lib/prisma";
import { requirePerfil } from "@/lib/auth";
import { FornecedoresClient, type FornecedorRow } from "./FornecedoresClient";

export default async function FornecedoresPage() {
  await requirePerfil(["ADMIN", "ANALISTA"]);

  const fornecedoresRaw = await prisma.fornecedor.findMany({ orderBy: { nome: "asc" } });

  const fornecedores: FornecedorRow[] = fornecedoresRaw.map((f) => ({
    id: f.id,
    nome: f.nome,
    abreviacao: f.abreviacao,
    codFornecedor: f.codFornecedor,
    contaContabil: f.contaContabil,
    bvPct: f.bvPct ? Number(f.bvPct) : null,
    taxaPct: f.taxaPct ? Number(f.taxaPct) : null,
  }));

  return <FornecedoresClient fornecedores={fornecedores} />;
}
