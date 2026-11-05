import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { LoginForm } from "./LoginForm";

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect("/");

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <div className="flex flex-col justify-center bg-navy px-8 py-12 md:w-[42%] md:px-14">
        <div className="mb-4 h-[0.1875rem] w-10 bg-green" />
        <h1 className="font-display text-3xl font-semibold text-white md:text-4xl">
          Gestão Comercial
        </h1>
        <p className="mt-3 max-w-xs text-[0.9375rem] leading-relaxed text-white/70">
          Regional Norte
        </p>
      </div>

      <div className="flex flex-1 items-center justify-center px-8 py-16">
        <div className="w-full max-w-sm">
          <h2 className="font-display mb-8 text-2xl font-semibold text-navy">
            Entrar
          </h2>
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
