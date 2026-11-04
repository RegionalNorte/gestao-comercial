import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  const { id } = await params;

  const reembolso = await prisma.reembolsoKm.findUnique({ where: { id } });
  if (!reembolso) return new Response("Não encontrado.", { status: 404 });

  // Mesma regra de visibilidade da listagem: Consultor só o próprio; Gerente
  // Comercial/Unidade só das unidades que gerencia; os demais perfis veem tudo.
  if (session.perfil === "CONSULTOR" && reembolso.consultorId !== session.sub) {
    return new Response("Não autorizado.", { status: 403 });
  }
  if (session.perfil === "GERENTE_COMERCIAL" || session.perfil === "GERENTE_UNIDADE") {
    const vinculo = await prisma.usuarioUnidade.findUnique({
      where: { usuarioId_unidadeId: { usuarioId: session.sub, unidadeId: reembolso.unidadeId } },
    });
    if (!vinculo) return new Response("Não autorizado.", { status: 403 });
  }

  const nomeSeguro = encodeURIComponent(reembolso.arquivoPdfNome);

  return new Response(new Uint8Array(reembolso.arquivoPdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${nomeSeguro}"; filename*=UTF-8''${nomeSeguro}`,
    },
  });
}
