/**
 * Planilhas do Excel (.xlsx) bem formatadas: título, cabeçalho colorido e fixo,
 * filtros, colunas na largura certa, valores em R$ e datas de verdade.
 * A biblioteca (exceljs) só é baixada quando alguém pede uma planilha.
 */

export type TipoColuna = 'texto' | 'numero' | 'moeda' | 'data';

export interface Coluna {
  titulo: string;
  tipo?: TipoColuna;
  /** Largura mínima (em caracteres). A coluna cresce com o conteúdo até `max`. */
  min?: number;
  max?: number;
  /** Texto longo: quebra em várias linhas em vez de esticar a coluna. */
  quebrar?: boolean;
  centro?: boolean;
  /** Soma esta coluna numa linha de total no fim. */
  somar?: boolean;
}

export type Valor = string | number | Date | null | undefined;

const VINHO = 'FF8E2A4E';
const ROSA_CLARO = 'FFFBF3F5';
const BORDA = 'FFE7DFE3';
const TEXTO = 'FF2E2638';

/** Data ISO "AAAA-MM-DD" → Date (meio-dia, para não virar o dia anterior no fuso). */
export const dataPlanilha = (iso: string) => new Date(`${iso}T12:00:00`);

function largura(v: Valor, tipo: TipoColuna): number {
  if (v === null || v === undefined) return 0;
  if (tipo === 'data') return 11;
  if (tipo === 'moeda') return (typeof v === 'number' ? v.toFixed(2).length : String(v).length) + 6;
  return String(v).length;
}

export async function gerarPlanilha(opcoes: { titulo: string; aba: string; colunas: Coluna[]; linhas: Valor[][] }): Promise<Blob> {
  const { default: ExcelJS } = await import('exceljs');
  const { titulo, aba, colunas, linhas } = opcoes;

  const livro = new ExcelJS.Workbook();
  livro.creator = 'ArtDecor';
  livro.created = new Date();
  const folha = livro.addWorksheet(aba, {
    views: [{ state: 'frozen', ySplit: 3, showGridLines: false }],
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9 },
  });

  // Larguras: o maior conteúdo da coluna, dentro dos limites.
  folha.columns = colunas.map((c, i) => {
    const tipo = c.tipo ?? 'texto';
    const maior = Math.max(c.titulo.length + 4, ...linhas.map((l) => largura(l[i], tipo)));
    const max = c.max ?? (c.quebrar ? 50 : 40);
    return { width: Math.min(max, Math.max(c.min ?? 10, maior + 2)) };
  });

  // Linha 1: título. Linha 2: respiro. Linha 3: cabeçalho.
  folha.mergeCells(1, 1, 1, colunas.length);
  const celTitulo = folha.getCell(1, 1);
  celTitulo.value = titulo;
  celTitulo.font = { name: 'Calibri', size: 16, bold: true, color: { argb: VINHO } };
  celTitulo.alignment = { vertical: 'middle' };
  folha.getRow(1).height = 30;
  folha.getRow(2).height = 6;

  const cabecalho = folha.getRow(3);
  cabecalho.values = colunas.map((c) => c.titulo);
  cabecalho.height = 26;
  cabecalho.eachCell((cel, n) => {
    cel.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    cel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: VINHO } };
    cel.alignment = { vertical: 'middle', horizontal: colunas[n - 1].centro ? 'center' : 'left', indent: colunas[n - 1].centro ? 0 : 1 };
  });

  linhas.forEach((linha, idx) => {
    const row = folha.addRow(linha.map((v) => (v === undefined ? null : v)));
    // Altura pelo texto que quebra (o Excel não ajusta sozinho ao abrir o arquivo).
    const linhasTexto = Math.max(
      1,
      ...colunas.map((c, i) => {
        const v = linha[i];
        if (!c.quebrar || typeof v !== 'string') return 1;
        const cabe = Math.max(1, (folha.getColumn(i + 1).width ?? 10) - 3);
        return v.split('\n').reduce((soma, parte) => soma + Math.max(1, Math.ceil(parte.length / cabe)), 0);
      }),
    );
    row.height = Math.max(20, linhasTexto * 15 + 5);
    row.eachCell({ includeEmpty: true }, (cel, n) => {
      const c = colunas[n - 1];
      if (!c) return;
      cel.font = { name: 'Calibri', size: 11, color: { argb: TEXTO } };
      cel.border = { bottom: { style: 'thin', color: { argb: BORDA } } };
      if (idx % 2 === 1) cel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ROSA_CLARO } };
      cel.alignment = {
        vertical: 'top',
        wrapText: Boolean(c.quebrar),
        horizontal: c.centro ? 'center' : c.tipo === 'moeda' || c.tipo === 'numero' ? 'right' : 'left',
        indent: c.centro || c.tipo === 'moeda' || c.tipo === 'numero' ? 0 : 1,
      };
      if (c.tipo === 'moeda' && typeof cel.value === 'number') cel.numFmt = '"R$" #,##0.00';
      if (c.tipo === 'data' && cel.value instanceof Date) cel.numFmt = 'dd/mm/yyyy';
    });
  });

  // Linha de total (fórmulas SOMA), quando alguma coluna pede.
  if (colunas.some((c) => c.somar) && linhas.length > 0) {
    const primeira = 4;
    const ultima = 3 + linhas.length;
    const row = folha.addRow(
      colunas.map((c, i) => {
        if (i === 0) return 'Total';
        if (!c.somar) return null;
        const letra = folha.getColumn(i + 1).letter;
        const resultado = linhas.reduce((s, l) => s + (typeof l[i] === 'number' ? (l[i] as number) : 0), 0);
        return { formula: `SUM(${letra}${primeira}:${letra}${ultima})`, result: resultado };
      }),
    );
    row.height = 22;
    row.eachCell({ includeEmpty: true }, (cel, n) => {
      const c = colunas[n - 1];
      if (!c) return;
      cel.font = { name: 'Calibri', size: 11, bold: true, color: { argb: VINHO } };
      cel.border = { top: { style: 'medium', color: { argb: VINHO } } };
      cel.alignment = { vertical: 'middle', horizontal: c.somar ? 'right' : 'left', indent: c.somar ? 0 : 1 };
      if (c.somar && c.tipo === 'moeda') cel.numFmt = '"R$" #,##0.00';
    });
  }

  folha.autoFilter = { from: { row: 3, column: 1 }, to: { row: 3 + linhas.length, column: colunas.length } };

  const buffer = await livro.xlsx.writeBuffer();
  return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}
