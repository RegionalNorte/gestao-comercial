import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  // Migrations usam a conexão direta (session pooler) — o transaction pooler
  // (DATABASE_URL, usado em runtime pela aplicação) não suporta DDL/advisory locks.
  datasource: {
    url: env("DIRECT_URL"),
  },
});
