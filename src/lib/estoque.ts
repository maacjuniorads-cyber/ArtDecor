import type { Item, Pedido, Tema } from '@/types';

/** Quantas unidades do item estão com clientes agora (pedidos "na rua"). */
export function quantidadeNaRua(itemId: string, pedidos: Pedido[]): number {
  let total = 0;
  for (const p of pedidos) {
    if (p.status !== 'rua') continue;
    for (const i of p.itens) if (i.itemId === itemId) total += i.quantidade;
  }
  return total;
}

export type Situacao =
  | { tipo: 'unica'; alugado: boolean }
  | { tipo: 'contado'; livres: number; total: number }
  | { tipo: 'sem-contagem'; naRua: number };

export function situacaoItem(item: Item, pedidos: Pedido[]): Situacao {
  const naRua = quantidadeNaRua(item.id, pedidos);
  if (item.tipo === 'unica') return { tipo: 'unica', alugado: naRua > 0 };
  if (item.quantidadeTotal === null) return { tipo: 'sem-contagem', naRua };
  return { tipo: 'contado', livres: Math.max(0, item.quantidadeTotal - naRua), total: item.quantidadeTotal };
}

/** Quantas unidades estão livres agora, ou null se o item não foi contado. */
export function livresAgora(item: Item, pedidos: Pedido[]): number | null {
  const s = situacaoItem(item, pedidos);
  if (s.tipo === 'unica') return s.alugado ? 0 : 1;
  if (s.tipo === 'contado') return s.livres;
  return null;
}

/** Itens que aparecem no estoque (sem os excluídos). */
export function itensAtivos(itens: Item[]): Item[] {
  return itens.filter((i) => !i.removido);
}

export function itensDoTema(tema: Tema, itens: Item[]): Item[] {
  return itens.filter((i) => i.temaId === tema.id && !i.removido);
}

/** Pedidos ainda em andamento (reservado ou na rua) que usam o item. */
export function pedidosAtivosComItem(itemId: string, pedidos: Pedido[]): Pedido[] {
  return pedidos.filter((p) => p.status !== 'devolvido' && p.itens.some((i) => i.itemId === itemId));
}

export type SituacaoTema = { tipo: 'livre' } | { tipo: 'rua'; pedido: Pedido } | { tipo: 'reservado'; pedido: Pedido };

export function situacaoTema(tema: Tema, itens: Item[], pedidos: Pedido[]): SituacaoTema {
  const ids = new Set(itensDoTema(tema, itens).map((i) => i.id));
  const usa = (p: Pedido) => p.temaIds.includes(tema.id) || p.itens.some((i) => ids.has(i.itemId));
  const naRua = pedidos.find((p) => p.status === 'rua' && usa(p));
  if (naRua) return { tipo: 'rua', pedido: naRua };
  const reservado = pedidos
    .filter((p) => p.status === 'reservado' && usa(p))
    .sort((a, b) => a.retirada.localeCompare(b.retirada))[0];
  if (reservado) return { tipo: 'reservado', pedido: reservado };
  return { tipo: 'livre' };
}

export function iniciais(nome: string): string {
  return nome
    .split(/\s+/)
    .map((p) => p.replace(/[^\p{L}]/gu, ''))
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();
}
