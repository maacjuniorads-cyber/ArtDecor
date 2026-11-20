import type { DataISO, Item, Pedido } from '@/types';

export function totalPedido(pedido: Pedido): number {
  return pedido.itens.reduce((soma, i) => soma + i.quantidade * i.valorUnitario, 0);
}

export function faltaReceber(pedido: Pedido): number {
  return Math.max(0, totalPedido(pedido) - pedido.sinal);
}

export function quantidadeDeItens(pedido: Pedido): number {
  return pedido.itens.reduce((soma, i) => soma + i.quantidade, 0);
}

export type TipoCompromisso = 'sai' | 'volta' | 'atrasado';

export interface Compromisso {
  pedido: Pedido;
  data: DataISO;
  tipo: TipoCompromisso;
}

/**
 * Agenda da casa: o que sai (pedidos reservados, na data de retirada)
 * e o que volta (pedidos na rua, na data de devolução). Devoluções
 * vencidas aparecem primeiro, como atrasadas.
 */
export function proximosCompromissos(pedidos: Pedido[], hoje: DataISO, limite = 5): Compromisso[] {
  const lista: Compromisso[] = [];
  for (const pedido of pedidos) {
    if (pedido.status === 'reservado' && pedido.retirada >= hoje) {
      lista.push({ pedido, data: pedido.retirada, tipo: 'sai' });
    } else if (pedido.status === 'rua') {
      lista.push({ pedido, data: pedido.devolucao, tipo: pedido.devolucao < hoje ? 'atrasado' : 'volta' });
    }
  }
  return lista.sort((a, b) => a.data.localeCompare(b.data)).slice(0, limite);
}

export function itensSemContagem(itens: Item[]): Item[] {
  return itens.filter((i) => i.quantidadeTotal === null);
}
