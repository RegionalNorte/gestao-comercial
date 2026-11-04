import { getSession } from "@/lib/auth";

export default async function HomePage() {
  const session = await getSession();

  return (
    <div className="px-8 py-10">
      <p className="text-sm text-muted">Início</p>
      <h1 className="font-display mt-1 text-2xl font-semibold text-navy">
        Olá, {session?.nome}
      </h1>
      <p className="mt-2 max-w-md text-[0.9375rem] text-muted">
        Use o menu ao lado para navegar pelos módulos do sistema.
      </p>
    </div>
  );
}
