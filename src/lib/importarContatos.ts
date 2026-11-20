/**
 * Importar clientes da agenda do celular.
 *
 * Fontes:
 * - Android (Chrome): a própria agenda, pelo seletor de contatos do navegador.
 * - Qualquer celular: um arquivo de contatos .vcf (vCard) exportado da agenda.
 * - Qualquer celular: números e nomes digitados ou colados (ex.: copiados do WhatsApp).
 * - Android, app instalado: "Compartilhar → ArtDecor" de outro app (contato ou texto com número).
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

/** novo: pode importar · cadastrado: já é cliente · vazio: sem nome e sem telefone (não dá pra importar). */
export type Situacao = 'novo' | 'cadastrado' | 'vazio';

/** O que falta no contato (pode importar mesmo assim e completar depois). */
export type Falta = 'telefone' | 'nome' | null;

export interface Candidato {
  chave: string;
  /** Nome para salvar ("" se o contato não tem nome). */
  nome: string;
  /** Telefone para salvar: "(53) 99133-3075", o número de fora como veio, ou "" se não tem. */
  telefone: string;
  situacao: Situacao;
  falta: Falta;
  /** Número de fora do Brasil (fica como está na agenda). */
  estrangeiro?: boolean;
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

// ------------------------------------------------------------------ texto (colado ou compartilhado)

/** Trechos que parecem telefone: "+55 53 99133-3075", "(53) 99133-3075", "53991333075"… */
const TRECHO_TELEFONE = /\+?\(?\d[\d\s().-]{6,}\d/g;

function limparNome(texto: string): string {
  const nome = texto
    .replace(/\b(tel|cel|celular|fone|telefone|whats|whatsapp|zap|n[uú]mero)\b\.?:?/gi, ' ')
    .replace(/[\s\-–—:,;|•*·.]+$/g, '')
    .replace(/^[\s\-–—:,;|•*·.]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  // Frase comprida não é nome (ex.: mensagem inteira colada junto).
  return nome.length > 50 ? '' : nome;
}

/**
 * Lê contatos de um texto, um por linha: "Maria Souza 53 99133-3075", só o número, ou só o nome.
 * Nome numa linha e número na de baixo também vale. Se o texto for um vCard, lê como vCard.
 * soComTelefone: ignora linhas que não têm número (para texto compartilhado de outro app).
 */
export function lerTexto(texto: string, { soComTelefone = false } = {}): ContatoBruto[] {
  if (/BEGIN:VCARD/i.test(texto)) return lerVcf(texto);
  const linhas = texto
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  const contatos: ContatoBruto[] = [];
  let nomeSolto: string | null = null;
  const soltar = () => {
    if (nomeSolto && !soComTelefone) contatos.push({ nome: nomeSolto, telefones: [] });
    nomeSolto = null;
  };

  for (const linha of linhas) {
    const telefones = [...linha.matchAll(TRECHO_TELEFONE)]
      .map((m) => m[0].trim())
      .filter((t) => {
        const n = t.replace(/\D/g, '').length;
        return n >= 8 && n <= 15;
      });
    let resto = linha;
    for (const t of telefones) resto = resto.replace(t, ' ');
    let nome = limparNome(resto);

    if (telefones.length === 0) {
      soltar();
      nomeSolto = nome || null;
      continue;
    }
    if (!nome && nomeSolto) {
      nome = nomeSolto; // nome na linha de cima, número nesta
      nomeSolto = null;
    } else {
      soltar();
    }
    if (nome) contatos.push({ nome, telefones });
    else for (const t of telefones) contatos.push({ nome: '', telefones: [t] }); // vários números soltos: um contato cada
  }
  soltar();
  return contatos;
}

// ------------------------------------------------------------------ compartilhado de outro app (Android)

export interface Compartilhado {
  arquivos: string[];
  texto: string;
}

let leitura: Promise<Compartilhado | null> | null = null;

/**
 * O que chegou pelo "Compartilhar → ArtDecor" (o service worker guarda; aqui lê e apaga).
 * Lê uma vez só, mesmo que a tela peça duas vezes.
 */
export function lerCompartilhado(): Promise<Compartilhado | null> {
  leitura ??= (async () => {
    try {
      if (!('caches' in window)) return null;
      const cache = await caches.open('artdecor-compartilhado');
      const r = await cache.match('/compartilhado');
      if (!r) return null;
      await cache.delete('/compartilhado');
      const dados = (await r.json()) as Partial<Compartilhado>;
      return { arquivos: dados.arquivos ?? [], texto: dados.texto ?? '' };
    } catch {
      return null;
    }
  })();
  return leitura;
}

/** Transforma o que foi compartilhado em contatos. */
export function contatosCompartilhados(c: Compartilhado): ContatoBruto[] {
  return [...c.arquivos.flatMap((a) => lerTexto(a, { soComTelefone: true })), ...lerTexto(c.texto, { soComTelefone: true })];
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

/** Nome sem acento e sem maiúsculas, para comparar. */
const chaveNome = (nome: string) => nome.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim();

/**
 * Monta a lista para marcar. Basta ter nome OU telefone: o que faltar ela completa depois.
 * Arruma o telefone, junta contatos repetidos e marca quem já é cliente
 * (pelo telefone; para quem não tem telefone, pelo nome).
 */
export function montarCandidatos(contatos: ContatoBruto[], clientes: Cliente[]): { candidatos: Candidato[]; repetidos: number } {
  const porTelefone = new Map<string, string>();
  const porNome = new Map<string, string>();
  for (const c of clientes) {
    if (c.removido) continue;
    if (c.nome.trim()) porNome.set(chaveNome(c.nome), c.nome);
    for (const t of [c.telefone, c.whatsapp ?? '']) {
      const d = t ? digitosTelefone(t) ?? (t.replace(/\D/g, '').length >= 8 ? t.replace(/\D/g, '') : null) : null;
      if (d) porTelefone.set(d, c.nome);
    }
  }

  const vistos = new Set<string>();
  const candidatos: Candidato[] = [];
  let repetidos = 0;
  contatos.forEach((c, i) => {
    const nome = c.nome.replace(/\s+/g, ' ').trim();
    const digitos = melhorTelefone(c.telefones);
    // Número de fora do Brasil: guarda como veio (o WhatsApp entende o número internacional).
    const original = c.telefones.map((t) => t.trim()).find((t) => t.replace(/\D/g, '').length >= 8) ?? '';
    const estrangeiro = !digitos && original.length > 0;
    const telefone = digitos ? formatarTelefone(digitos) : original;
    const chaveTel = digitos ?? (estrangeiro ? original.replace(/\D/g, '') : '');

    const chave = chaveTel ? `tel:${chaveTel}` : nome ? `nome:${chaveNome(nome)}` : `vazio:${i}`;
    if (vistos.has(chave)) {
      repetidos++;
      return;
    }
    vistos.add(chave);

    const ja = chaveTel ? porTelefone.get(chaveTel) : nome ? porNome.get(chaveNome(nome)) : undefined;
    candidatos.push({
      chave,
      nome,
      telefone,
      situacao: !nome && !telefone ? 'vazio' : ja ? 'cadastrado' : 'novo',
      falta: !telefone ? 'telefone' : !nome ? 'nome' : null,
      estrangeiro: estrangeiro || undefined,
      jaCadastradoComo: ja,
    });
  });
  candidatos.sort((a, b) => (a.nome || '￿').localeCompare(b.nome || '￿', 'pt-BR'));
  return { candidatos, repetidos };
}
