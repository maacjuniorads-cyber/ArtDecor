/**
 * Categorias do estoque.
 *
 * As 10 padrão (Painéis, Cilindros…) aparecem sempre. As novas não ficam numa
 * tabela à parte: existem enquanto alguma peça usa. Ao criar uma peça com
 * "Bandejas", ela aparece para todo mundo; se nenhuma peça usar mais, some.
 */
import { CATEGORIAS, type Item } from '@/types';

const chave = (nome: string) => nome.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim();

/** As padrão, na ordem de sempre, e depois as criadas pela equipe (em ordem alfabética). */
export function listaCategorias(itens: Item[], incluir?: string): string[] {
  const padrao = new Set(CATEGORIAS.map(chave));
  const novas = new Map<string, string>();
  for (const i of itens) {
    if (i.removido || !i.categoria) continue;
    const k = chave(i.categoria);
    if (!padrao.has(k) && !novas.has(k)) novas.set(k, i.categoria);
  }
  if (incluir && !padrao.has(chave(incluir)) && !novas.has(chave(incluir))) novas.set(chave(incluir), incluir);
  return [...CATEGORIAS, ...[...novas.values()].sort((a, b) => a.localeCompare(b, 'pt-BR'))];
}

/**
 * Nome digitado para uma categoria nova: se já existe uma igual (sem contar
 * maiúsculas, acentos e espaços), usa a que existe; senão, arruma o texto.
 */
export function nomeCategoria(digitado: string, existentes: string[]): string {
  const limpo = digitado.replace(/\s+/g, ' ').trim();
  if (!limpo) return '';
  const igual = existentes.find((c) => chave(c) === chave(limpo));
  if (igual) return igual;
  return limpo.charAt(0).toLocaleUpperCase('pt-BR') + limpo.slice(1);
}

/** Posição para ordenar: as padrão primeiro, na ordem delas; depois as novas. */
export function ordemCategoria(categoria: string): number {
  const i = (CATEGORIAS as readonly string[]).indexOf(categoria);
  return i >= 0 ? i : CATEGORIAS.length;
}

/** É uma das 10 de sempre? (Essas não dá para renomear.) */
export function ehCategoriaPadrao(categoria: string): boolean {
  return (CATEGORIAS as readonly string[]).includes(categoria);
}
