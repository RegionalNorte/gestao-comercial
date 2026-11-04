# Gestão Comercial

Sistema de gestão Comercial — módulo V&M: controle de metas, verbas de fornecedores, pedidos,
transferências de saldo e planejamento de campanhas sazonais, por área/unidade.

Base técnica: Next.js (front) + Prisma + PostgreSQL (local em desenvolvimento, Supabase/Vercel em
produção).

## Pré-requisitos

- Node.js 20+
- PostgreSQL local rodando (porta padrão `5432`)

## Configuração inicial

1. Instale as dependências:

   ```bash
   npm install
   ```

2. Crie o banco local (se ainda não existir):

   ```bash
   createdb gestao_vm
   # ou, via psql:
   # psql -U postgres -c "CREATE DATABASE gestao_vm;"
   ```

3. Copie `.env.example` para `.env` e ajuste a senha do usuário `postgres`:

   ```bash
   cp .env.example .env
   ```

4. Gere o Prisma Client e aplique as migrations:

   ```bash
   npx prisma generate
   npx prisma migrate dev
   ```

5. Popule os cadastros básicos (áreas, unidades, fornecedores e usuário Admin), extraídos da
   planilha de origem em `docs/`:

   ```bash
   npx prisma db seed
   ```

   O seed imprime no console quais fornecedores ficaram sem BV%/Taxa% definidos na planilha
   original — isso é esperado (dados inconsistentes na fonte) e deve ser revisado manualmente
   mais adiante, na tela de Fornecedores.

6. Rode o projeto em desenvolvimento:

   ```bash
   npm run dev
   ```

   Abra [http://localhost:3000](http://localhost:3000).

## Scripts úteis

- `npm run dev` — sobe o Next.js em modo desenvolvimento
- `npm run build` / `npm run start` — build e start de produção
- `npm run db:migrate` — cria/aplica migrations do Prisma (`prisma migrate dev`)
- `npm run db:seed` — roda o seed (`tsx prisma/seed.ts`)
- `npm run db:studio` — abre o Prisma Studio para inspecionar o banco

## Estrutura do projeto

- `prisma/schema.prisma` — modelo de dados
- `prisma/seed.ts` — importa dados básicos a partir da planilha em `docs/`
- `src/lib/prisma.ts` — client singleton do Prisma (usa driver adapter `@prisma/adapter-pg`)
- `src/generated/prisma` — client gerado pelo Prisma (não versionado, gerado via `prisma generate`)
- `docs/` — planilha de origem e paleta de cores do sistema (referência, não código)

## Documentação do projeto

O plano de construção do sistema (perfis de acesso, regras de negócio, menu e modelo de dados)
está em `C:\Users\ednelson.ferreira\.claude\plans\bubbly-herding-sphinx.md`.
