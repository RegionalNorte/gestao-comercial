import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { AppShell } from "./AppShell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <AppShell nome={session.nome} perfil={session.perfil}>
      {children}
    </AppShell>
  );
}
