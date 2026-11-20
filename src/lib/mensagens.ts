/** Textos prontos para enviar ao cliente pelo WhatsApp. */
import { empresa } from './empresa';
import { deISO, formatarMoeda, hojeISO, somarDias } from './formato';
import { faltaReceber, numeroPedido } from './pedidos';
import type { Cliente, Pedido } from '@/types';

/** "hoje", "amanhã" ou "na segunda, 23/11". */
export function quandoPorExtenso(iso: string, hoje: string = hojeISO()): string {
  if (iso === hoje) return 'hoje';
  if (iso === somarDias(hoje, 1)) return 'amanhã';
  const d = deISO(iso);
  const dia = d.toLocaleDateString('pt-BR', { weekday: 'long' }).replace('-feira', '');
  return `${dia === 'sábado' || dia === 'domingo' ? 'no' : 'na'} ${dia}, ${d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`;
}

function primeiroNome(cliente?: Cliente): string {
  return cliente ? `, ${cliente.nome.split(' ')[0]}` : '';
}

function linhaPagamento(pedido: Pedido): string {
  const falta = faltaReceber(pedido);
  if (falta <= 0) return '';
  return `\nFica pendente o valor de ${formatarMoeda(falta)} (Pix: ${empresa.pixChave}, dinheiro ou cartão).`;
}

export function lembreteDevolucao(pedido: Pedido, cliente?: Cliente): string {
  return [
    `Olá${primeiroNome(cliente)}! Tudo bem?`,
    `Passando para lembrar que a devolução dos itens da ${empresa.nome} (pedido nº ${numeroPedido(pedido).slice(1)}) é ${quandoPorExtenso(pedido.devolucao)}.${linhaPagamento(pedido)}`,
    'Qualquer dúvida, é só chamar. Obrigada!',
  ].join('\n');
}

export function lembreteRetirada(pedido: Pedido, cliente?: Cliente): string {
  return [
    `Olá${primeiroNome(cliente)}! Tudo bem?`,
    `Passando para lembrar que a retirada dos itens da ${empresa.nome} (pedido nº ${numeroPedido(pedido).slice(1)}) é ${quandoPorExtenso(pedido.retirada)}.${linhaPagamento(pedido)}`,
    'Qualquer dúvida, é só chamar. Até lá!',
  ].join('\n');
}
