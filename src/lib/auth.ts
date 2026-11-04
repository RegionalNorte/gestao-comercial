import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Perfil } from "../generated/prisma";

export const SESSION_COOKIE = "gestao_vm_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 8; // 8 horas

const PENDING_SENHA_COOKIE = "gestao_vm_pending_senha";
const PENDING_SENHA_DURATION_SECONDS = 60 * 15; // 15 minutos

function getSecretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET não configurado no .env");
  return new TextEncoder().encode(secret);
}

export type SessionPayload = {
  sub: string;
  nome: string;
  email: string;
  perfil: Perfil;
};

export async function createSession(payload: SessionPayload) {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(getSecretKey());

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    return {
      sub: String(payload.sub),
      nome: String(payload.nome),
      email: String(payload.email),
      perfil: payload.perfil as Perfil,
    };
  } catch {
    return null;
  }
}

export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

// Segunda camada de proteção além de esconder o item no menu: impede acesso direto
// pela URL por um perfil sem permissão para a tela.
export async function requirePerfil(perfis: Perfil[]): Promise<SessionPayload> {
  const session = await requireSession();
  if (!perfis.includes(session.perfil)) redirect("/");
  return session;
}

// Usuário é criado pelo Admin sem senha (ou tem a senha zerada via "Resetar senha"); ao
// tentar entrar nesse estado, em vez de validar credenciais, abrimos uma janela curta
// pra ele mesmo definir a senha em /criar-senha — sem isso, nenhuma sessão completa é
// criada, então essa janela não dá acesso a nada além da tela de criação de senha.
export async function createPendingSenhaSession(usuarioId: string) {
  const token = await new SignJWT({ sub: usuarioId, purpose: "criar_senha" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${PENDING_SENHA_DURATION_SECONDS}s`)
    .sign(getSecretKey());

  const cookieStore = await cookies();
  cookieStore.set(PENDING_SENHA_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: PENDING_SENHA_DURATION_SECONDS,
  });
}

export async function getPendingSenhaUsuarioId(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(PENDING_SENHA_COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (payload.purpose !== "criar_senha") return null;
    return String(payload.sub);
  } catch {
    return null;
  }
}

export async function clearPendingSenhaSession() {
  const cookieStore = await cookies();
  cookieStore.delete(PENDING_SENHA_COOKIE);
}
