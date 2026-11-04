import "server-only";
import { extractText, getDocumentProxy } from "unpdf";

export type ReembolsoKmItemExtraido = {
  data: Date;
  tarefaCodigo: string;
  clientePartida: string;
  clienteChegada: string;
  km: number;
  valor: number;
};

export type RelatorioKmExtraido = {
  colaborador: string;
  equipe: string | null;
  periodoInicio: Date;
  periodoFim: Date;
  totalKm: number;
  totalValor: number;
  itens: ReembolsoKmItemExtraido[];
};

// Números do relatório usam vírgula como separador decimal e nunca têm separador de
// milhar (ex.: "304,180", "7,07", "0,00") — troca direta de vírgula por ponto.
function normalizarNumero(raw: string): number {
  return Number(raw.replace(",", "."));
}

function parseDataBr(raw: string): Date | null {
  const m = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const [, dia, mes, ano] = m;
  return new Date(`${ano}-${mes}-${dia}T00:00:00.000Z`);
}

// O PDF (gerado por um sistema de terceiros) intercala, entre os blocos de tarefa, dois
// tipos de ruído que não fazem parte do conteúdo de cada viagem: os marcadores de rodapé
// de página ("Página N de M") e um índice de códigos de tarefa da página seguinte
// ("Tarefa - 12345"), que aparecem fora de ordem em relação ao bloco a que pertencem.
// Os códigos, no entanto, aparecem na mesma ordem dos blocos (1 código por bloco) — por
// isso extraímos essa lista à parte e associamos por posição, depois de remover o ruído
// do texto principal pra poder casar "DATA + Colaborador + ... + Valor" de forma confiável.
const TAREFA_CODIGO_RE = /Tarefa\s*-\s*(\d+)/g;
const PAGINA_RODAPE_RE = /Página\s+\d+\s+de\s+\d+/g;

const BLOCO_RE =
  /(\d{2}\/\d{2}\/\d{4})\s+Colaborador\s+([\s\S]+?)\s+Equipe\s+([\s\S]+?)\s+Cliente\s+Partida\s+([\s\S]+?)\s+Cliente\s+Chegada\s+([\s\S]+?)\s+Km\s+Entre\s+tarefas\s+([\d,]+)\s*Km\s+Valor\s+Km\s*entre\s+tarefas\s+R\$\s*([\d,]+)/g;

export async function parseRelatorioKm(
  buffer: Uint8Array,
): Promise<{ dados: RelatorioKmExtraido } | { error: string }> {
  let textoCompleto: string;
  try {
    const pdf = await getDocumentProxy(buffer);
    const { text } = await extractText(pdf, { mergePages: true });
    textoCompleto = text;
  } catch {
    return { error: "Não foi possível ler o arquivo PDF. Confira se o arquivo não está corrompido." };
  }

  // Totais do cabeçalho ("Valor total" / "Tarefas X KM" / "R$ Y"), antes do primeiro bloco.
  const indicePrimeiraData = textoCompleto.search(/\d{2}\/\d{2}\/\d{4}/);
  const cabecalho = indicePrimeiraData >= 0 ? textoCompleto.slice(0, indicePrimeiraData) : textoCompleto;
  const totalKmMatch = cabecalho.match(/Tarefas\s+([\d,]+)\s*KM/);
  const totalValorMatch = cabecalho.match(/R\$\s*([\d,]+)/);
  if (!totalKmMatch || !totalValorMatch) {
    return { error: "Não foi possível localizar os totais do relatório neste PDF." };
  }

  const codigos = [...textoCompleto.matchAll(TAREFA_CODIGO_RE)].map((m) => m[1]);

  const textoSemRuido = textoCompleto.replace(TAREFA_CODIGO_RE, "").replace(PAGINA_RODAPE_RE, "");

  const itens: ReembolsoKmItemExtraido[] = [];
  let colaborador: string | null = null;
  let equipe: string | null = null;
  let indiceBloco = 0;
  for (const match of textoSemRuido.matchAll(BLOCO_RE)) {
    const [, dataRaw, colaboradorRaw, equipeRaw, partidaRaw, chegadaRaw, kmRaw, valorRaw] = match;
    const data = parseDataBr(dataRaw);
    if (!data) continue;

    if (colaborador === null) {
      colaborador = colaboradorRaw.replace(/\s+/g, " ").trim();
      equipe = equipeRaw.replace(/\s+/g, " ").trim() || null;
    }

    itens.push({
      data,
      tarefaCodigo: codigos[indiceBloco] ?? "",
      clientePartida: partidaRaw.replace(/\s+/g, " ").trim(),
      clienteChegada: chegadaRaw.replace(/\s+/g, " ").trim(),
      km: normalizarNumero(kmRaw),
      valor: normalizarNumero(valorRaw),
    });
    indiceBloco++;
  }

  if (itens.length === 0 || !colaborador) {
    return { error: "Não foi possível identificar as tarefas deste relatório. Confira se o PDF é o relatório de Km Rodado." };
  }

  const datas = itens.map((i) => i.data.getTime());
  const periodoInicio = new Date(Math.min(...datas));
  const periodoFim = new Date(Math.max(...datas));

  return {
    dados: {
      colaborador,
      equipe,
      periodoInicio,
      periodoFim,
      totalKm: normalizarNumero(totalKmMatch[1]),
      totalValor: normalizarNumero(totalValorMatch[1]),
      itens,
    },
  };
}
