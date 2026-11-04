import { requireSession } from "@/lib/auth";
import { AppShell } from "./AppShell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();

  return (
    <AppShell nome={session.nome} perfil={session.perfil}>
      {children}
    </AppShell>
  );
}
