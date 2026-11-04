// Seed inicial: lê a planilha de origem em docs/ e popula áreas, unidades, fornecedores
// e o usuário Admin. Não migra lançamentos/metas/brindes históricos (fica para partes futuras).
import "dotenv/config";
import { TipoVerba } from "../src/generated/prisma";
import { prisma } from "../src/lib/prisma";
import bcrypt from "bcryptjs";
import * as XLSX from "xlsx";
import path from "node:path";

const XLSX_PATH = path.join(
  __dirname,
  "..",
  "docs",
  "CONTROLE FORNECEDORES VERBAS GERAL 27.1 V&M.xlsx"
);

const ADMIN = {
  nome: "admin",
  email: "admin@admin.com",
  senha: "372485",
};

function normalize(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toUpperCase();
}

function cell(sheet: XLSX.WorkSheet, address: string): unknown {
  const c = sheet[address];
  return c ? c.v : undefined;
}

type AreaUnidade = { area: string; unidade: string; gerenteNome?: string };
type FornecedorApoio = {
  nomeCurto: string;
  bvPct?: number;
  taxaPct?: number;
  tipoVerba?: string;
};
type FornecedorDoc = {
  nomeLegal: string;
  codFornecedor?: string;
  contaContabil?: string;
};

function lerAreasUnidades(wb: XLSX.WorkBook): AreaUnidade[] {
  const sheet = wb.Sheets["APOIO"];
  const out: AreaUnidade[] = [];
  for (let row = 4; row <= 60; row++) {
    const area = cell(sheet, `O${row}`);
    const unidade = cell(sheet, `P${row}`);
    const gerente = cell(sheet, `Q${row}`);
    if (!area && !unidade) continue;
    if (!area || !unidade) {
      console.warn(`[APOIO] linha ${row}: área ou unidade ausente, pulando (área=${area}, unidade=${unidade})`);
      continue;
    }
    out.push({
      area: String(area).trim(),
      unidade: String(unidade).trim(),
      gerenteNome: gerente ? String(gerente).trim() : undefined,
    });
  }
  return out;
}

function lerFornecedoresApoio(wb: XLSX.WorkBook): FornecedorApoio[] {
  const sheet = wb.Sheets["APOIO"];
  const out: FornecedorApoio[] = [];
  for (let row = 4; row <= 20; row++) {
    const nome = cell(sheet, `F${row}`);
    if (!nome) continue;
    const bv = cell(sheet, `G${row}`);
    const taxa = cell(sheet, `H${row}`);
    const tipo = cell(sheet, `I${row}`);
    out.push({
      nomeCurto: String(nome).trim(),
      bvPct: typeof bv === "number" ? bv : undefined,
      taxaPct: typeof taxa === "number" ? taxa : undefined,
      tipoVerba: tipo ? String(tipo).trim() : undefined,
    });
  }
  return out;
}

// Lê fornecedores "reais" (nome legal + código + conta contábil) a partir da aba de pagamento/NF,
// filtrando só linhas marcadas como tipo de verba V&M (OOH fica fora do sistema).
function lerFornecedoresPgNf(wb: XLSX.WorkBook): FornecedorDoc[] {
  const sheet = wb.Sheets[" PG - NF"];
  const vistos = new Map<string, FornecedorDoc>();
  for (let row = 9; row <= 200; row++) {
    const fornecedor = cell(sheet, `N${row}`);
    if (!fornecedor) continue;
    const tipoVerba = cell(sheet, `R${row}`);
    if (normalize(tipoVerba) !== "V&M" && normalize(tipoVerba) !== "VM") continue;
    const codFornecedor = cell(sheet, `M${row}`);
    const contaContabil = cell(sheet, `O${row}`);
    const nomeLegal = String(fornecedor).trim();
    if (!vistos.has(nomeLegal)) {
      vistos.set(nomeLegal, {
        nomeLegal,
        codFornecedor: codFornecedor !== undefined ? String(codFornecedor) : undefined,
        contaContabil: contaContabil !== undefined ? String(contaContabil) : undefined,
      });
    }
  }
  return [...vistos.values()];
}

async function main() {
  console.log(`Lendo planilha: ${XLSX_PATH}`);
  const wb = XLSX.readFile(XLSX_PATH);

  // --- Áreas e Unidades (aba APOIO, colunas O:Q) ---
  const areaUnidadeRows = lerAreasUnidades(wb);
  const areasUnicas = [...new Set(areaUnidadeRows.map((r) => r.area))];

  const areaIdPorNome = new Map<string, string>();
  for (const nome of areasUnicas) {
    const area = await prisma.area.upsert({
      where: { nome },
      update: {},
      create: { nome },
    });
    areaIdPorNome.set(nome, area.id);
  }
  console.log(`Áreas criadas/atualizadas: ${areasUnicas.length}`);

  let unidadesCriadas = 0;
  for (const row of areaUnidadeRows) {
    const areaId = areaIdPorNome.get(row.area)!;
    await prisma.unidade.upsert({
      where: { nome_areaId: { nome: row.unidade, areaId } },
      update: {},
      create: { nome: row.unidade, areaId },
    });
    unidadesCriadas++;
    if (row.gerenteNome) {
      console.log(
        `  [info] unidade "${row.unidade}" (${row.area}) tinha gerente "${row.gerenteNome}" na planilha — cadastrar esse usuário manualmente na tela de Usuários quando ela existir.`
      );
    }
  }
  console.log(`Unidades criadas/atualizadas: ${unidadesCriadas}`);

  // --- Fornecedores (consolidação APOIO + PG-NF) ---
  const fornecedoresApoio = lerFornecedoresApoio(wb);
  const fornecedoresDoc = lerFornecedoresPgNf(wb);

  const semTaxaOuBv: string[] = [];
  const semCorrespondencia: string[] = [];

  // 1) fornecedores com nome legal conhecido (PG-NF), tentando casar com a taxa cadastrada em APOIO
  for (const doc of fornecedoresDoc) {
    const nomeLegalNorm = normalize(doc.nomeLegal);
    const match = fornecedoresApoio.find((f) => nomeLegalNorm.includes(normalize(f.nomeCurto)));

    const bvPct = match?.bvPct;
    const taxaPct = match?.taxaPct;
    if (!match) semCorrespondencia.push(doc.nomeLegal);
    else if (bvPct === undefined || taxaPct === undefined) semTaxaOuBv.push(doc.nomeLegal);

    await prisma.fornecedor.upsert({
      where: { nome: doc.nomeLegal },
      update: {},
      create: {
        nome: doc.nomeLegal,
        abreviacao: match?.nomeCurto,
        codFornecedor: doc.codFornecedor,
        contaContabil: doc.contaContabil,
        tipoVerba: TipoVerba.VM,
        bvPct,
        taxaPct,
      },
    });
  }

  // 2) fornecedores só cadastrados em APOIO, sem lançamento ainda em PG-NF
  const nomesLegaisNorm = fornecedoresDoc.map((d) => normalize(d.nomeLegal));
  for (const f of fornecedoresApoio) {
    const jaCriado = nomesLegaisNorm.some((n) => n.includes(normalize(f.nomeCurto)));
    if (jaCriado) continue;
    if (f.bvPct === undefined || f.taxaPct === undefined) semTaxaOuBv.push(f.nomeCurto);

    await prisma.fornecedor.upsert({
      where: { nome: f.nomeCurto },
      update: {},
      create: {
        nome: f.nomeCurto,
        tipoVerba: TipoVerba.VM,
        bvPct: f.bvPct,
        taxaPct: f.taxaPct,
      },
    });
  }

  console.log(`Fornecedores criados/atualizados: ${fornecedoresDoc.length + fornecedoresApoio.length} (upsert, pode haver sobreposição)`);
  if (semTaxaOuBv.length) {
    console.warn(
      `\n[ATENÇÃO] Fornecedores sem BV% e/ou Taxa% definidos na planilha (ficaram com null — revisar manualmente):\n  - ${[...new Set(semTaxaOuBv)].join("\n  - ")}\n`
    );
  }
  if (semCorrespondencia.length) {
    console.warn(
      `[ATENÇÃO] Fornecedores com nome legal (PG-NF) sem correspondência na tabela de taxas da aba APOIO:\n  - ${[...new Set(semCorrespondencia)].join("\n  - ")}\n`
    );
  }

  // --- Tipos de planejamento (catálogo inicial) ---
  const TIPOS_PLANEJAMENTO = ["ENEM", "VIVA ESTÁCIO"];
  for (const nome of TIPOS_PLANEJAMENTO) {
    await prisma.tipoPlanejamento.upsert({
      where: { nome },
      update: {},
      create: { nome },
    });
  }
  console.log(`Tipos de planejamento criados/atualizados: ${TIPOS_PLANEJAMENTO.length}`);

  // --- Usuário Admin inicial ---
  const senhaHash = await bcrypt.hash(ADMIN.senha, 10);
  await prisma.usuario.upsert({
    where: { email: ADMIN.email },
    update: {},
    create: {
      nome: ADMIN.nome,
      email: ADMIN.email,
      senhaHash,
      perfil: "ADMIN",
    },
  });
  console.log(`Usuário Admin pronto: ${ADMIN.email}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
