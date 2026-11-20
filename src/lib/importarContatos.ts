/**
 * Importar clientes da agenda do celular.
 *
 * Duas fontes:
 * - Android (Chrome): a própria agenda, pelo seletor de contatos do navegador.
 * - Qualquer celular: um arquivo de contatos .vcf (vCard) exportado da agenda.
 *
 * Só nome e telefone entram; o resto (endereço, veículo) é completado depois.
 */
import type { Cliente } from '@/types';

/** DDD de Jaguarão: usado quando o número na agenda está sem DDD. */
export const DDD_PADRAO = '53';

export interface ContatoBruto {
  nome: string;
  telefones: string[];
}

export type Situacao = 'novo' | 'cadastrado' | 'sem-telefone' | 'sem-nome';

export interface Candidato {
  chave: string;
  nome: string;
  /** Telefone já arrumado: "(53) 99133-3075". */
  telefone: string;
  situacao: Situacao;
  /** Nome do cliente que já tem esse telefone. */
  jaCadastradoComo?: string;
}

// ------------------------------------------------------------------ telefone

/**
 * Deixa só os dígitos de um telefone brasileiro, com DDD (10 ou 11 dígitos).
 * Tira +55, 0 da frente e código de operadora; põe o DDD da loja se faltar;
 * põe o 9 em celular antigo de 8 dígitos. Número estrangeiro ou inválido: null.
 */
export function digitosTelefone(bruto: string, ddd = DDD_PADRAO): string | null {
  const texto = bruto.trim();
  let d = texto.replace(/\D/g, '');
  if (!d) return null;
  const internacional = texto.startsWith('+') || d.startsWith('00');
  if (d.startsWith('00')) d = d.slice(2);
  if (internacional) {
    if (!d.startsWith('55')) return null; // estrangeiro
    d = d.slice(2);
  } else if ((d.length === 12 || d.length === 13) && d.startsWith('55')) {
    d = d.slice(2);
  }
  if (d.length >= 13 && d.startsWith('0')) d = d.slice(3); // 0 + operadora (ex.: 0 15 53 ...)
  if (d.startsWith('0')) d = d.slice(1);
  if (d.length === 8 || d.length === 9) d = ddd + d; // sem DDD
  if (d.length === 10 && /[6-9]/.test(d[2])) d = d.slice(0, 2) + '9' + d.slice(2); // celular sem o 9
  if (d.length !== 10 && d.length !== 11) return null;
  if (d.length === 11 && d[2] !== '9') return null;
  if (d[0] === '0') return null;
  return d;
}

/** "53991333075" → "(53) 99133-3075"; "5332611234" → "(53) 3261-1234". */
export function formatarTelefone(digitos: string): string {
  const ddd = digitos.slice(0, 2);
  const resto = digitos.slice(2);
  const corte = resto.length - 4;
  return `(${ddd}) ${resto.slice(0, corte)}-${resto.slice(corte)}`;
}

/** Entre vários telefones do contato, prefere o celular. */
function melhorTelefone(telefones: string[]): string | null {
  const validos = telefones.map((t) => digitosTelefone(t)).filter((d): d is string => d !== null);
  return validos.find((d) => d.length === 11) ?? validos[0] ?? null;
}

// ------------------------------------------------------------------ vCard (.vcf)

function decodificarQuotedPrintable(texto: string): string {
  const bytes: number[] = [];
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (c === '=' && /^[0-9A-Fa-f]{2}$/.test(texto.slice(i + 1, i + 3))) {
      bytes.push(parseInt(texto.slice(i + 1, i + 3), 16));
      i += 2;
    } else {
      bytes.push(...new TextEncoder().encode(c));
    }
  }
  return new TextDecoder('utf-8').decode(new Uint8Array(bytes));
}

const desescapar = (v: string) => v.replace(/\\n/gi, ' ').replace(/\\([,;:\\])/g, '$1');

/** Lê um arquivo .vcf (um ou vários contatos). Aceita os formatos do Android e do iPhone. */
export function lerVcf(texto: string): ContatoBruto[] {
  // Junta as linhas quebradas: continuação começa com espaço; quoted-printable termina com "=".
  const linhas: string[] = [];
  for (const linha of texto.replace(/\r\n?/g, '\n').split('\n')) {
    const anterior = linhas[linhas.length - 1];
    if (anterior !== undefined && /^[ \t]/.test(linha)) {
      linhas[linhas.length - 1] = anterior + linha.slice(1);
    } else if (anterior !== undefined && /QUOTED-PRINTABLE/i.test(anterior) && anterior.endsWith('=')) {
      linhas[linhas.length - 1] = anterior.slice(0, -1) + linha;
    } else {
      linhas.push(linha);
    }
  }

  const contatos: ContatoBruto[] = [];
  let atual: { fn: string; n: string; telefones: string[] } | null = null;
  for (const linha of linhas) {
    const doisPontos = linha.indexOf(':');
    if (doisPontos < 0) continue;
    const chave = linha.slice(0, doisPontos);
    let valor = linha.slice(doisPontos + 1);
    const partes = chave.split(';');
    const prop = partes[0].replace(/^.*\./, '').toUpperCase(); // "item1.TEL" → "TEL"
    if (partes.some((p) => /ENCODING=QUOTED-PRINTABLE/i.test(p))) valor = decodificarQuotedPrintable(valor);

    if (prop === 'BEGIN' && /VCARD/i.test(valor)) atual = { fn: '', n: '', telefones: [] };
    else if (prop === 'END' && /VCARD/i.test(valor)) {
      if (atual) {
        // N vem como "Sobrenome;Nome;Meio;Prefixo;Sufixo".
        const [familia = '', dado = '', meio = ''] = atual.n.split(';').map(desescapar);
        const nome = desescapar(atual.fn).trim() || [dado, meio, familia].filter(Boolean).join(' ').trim();
        contatos.push({ nome, telefones: atual.telefones });
      }
      atual = null;
    } else if (atual && prop === 'FN') atual.fn = valor;
    else if (atual && prop === 'N') atual.n = valor;
    else if (atual && prop === 'TEL') atual.telefones.push(valor.replace(/^tel:/i, ''));
  }
  return contatos;
}

// ------------------------------------------------------------------ agenda do Android

interface ContatoDoNavegador {
  name?: string[];
  tel?: string[];
}

/** O navegador deixa escolher contatos da agenda? (Chrome no Android, sim; iPhone, não.) */
export function agendaDisponivel(): boolean {
  return 'contacts' in navigator && 'ContactsManager' in window;
}

/** Abre a agenda do celular para escolher vários contatos. */
export async function escolherDaAgenda(): Promise<ContatoBruto[]> {
  const nav = navigator as Navigator & {
    contacts: { select: (props: string[], opts: { multiple: boolean }) => Promise<ContatoDoNavegador[]> };
  };
  const escolhidos = await nav.contacts.select(['name', 'tel'], { multiple: true });
  return escolhidos.map((c) => ({ nome: (c.name?.[0] ?? '').trim(), telefones: c.tel ?? [] }));
}

// ------------------------------------------------------------------ lista para marcar

/**
 * Monta a lista para marcar: arruma o telefone, junta contatos repetidos
 * e marca quem já é cliente (pelo telefone ou WhatsApp).
 */
export function montarCandidatos(contatos: ContatoBruto[], clientes: Cliente[]): { candidatos: Candidato[]; repetidos: number } {
  const jaTem = new Map<string, string>();
  for (const c of clientes) {
    if (c.removido) continue;
    for (const t of [c.telefone, c.whatsapp ?? '']) {
      const d = t ? digitosTelefone(t) : null;
      if (d) jaTem.set(d, c.nome);
    }
  }

  const vistos = new Set<string>();
  const candidatos: Candidato[] = [];
  let repetidos = 0;
  contatos.forEach((c, i) => {
    const digitos = melhorTelefone(c.telefones);
    const nome = c.nome.replace(/\s+/g, ' ').trim();
    if (digitos && vistos.has(digitos)) {
      repetidos++;
      return;
    }
    if (digitos) vistos.add(digitos);
    const situacao: Situacao = !digitos ? 'sem-telefone' : !nome ? 'sem-nome' : jaTem.has(digitos) ? 'cadastrado' : 'novo';
    candidatos.push({
      chave: digitos ?? `sem-${i}`,
      nome: nome || 'Sem nome',
      telefone: digitos ? formatarTelefone(digitos) : c.telefones[0] ?? 'sem telefone',
      situacao,
      jaCadastradoComo: digitos ? jaTem.get(digitos) : undefined,
    });
  });
  candidatos.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  return { candidatos, repetidos };
}
