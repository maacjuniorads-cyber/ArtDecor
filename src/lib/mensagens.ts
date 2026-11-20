/**
 * Textos prontos para enviar ao cliente pelo WhatsApp.
 * São identificados como mensagens automáticas do sistema da ArtDecor
 * (quem envia não precisa "assinar" a cobrança/lembrete pessoalmente).
 * No WhatsApp, *texto* vira negrito e _texto_ vira itálico.
 */
import { empresa } from './empresa';
import { deISO, formatarMoeda, hojeISO, somarDias } from './formato';
import { faltaReceber, numeroPedido, totalPago, totalPedido } from './pedidos';
import type { Cliente, Pedido } from '@/types';

export const RODAPE_AUTOMATICO = `_Mensagem automática do sistema da ${empresa.nome}._`;

/** "hoje", "amanhã (sábado, 21/11)" ou "segunda, 23/11". */
export function quandoPorExtenso(iso: string, hoje: string = hojeISO()): string {
  const d = deISO(iso);
  const diaSemana = d.toLocaleDateString('pt-BR', { weekday: 'long' }).replace('-feira', '');
  const data = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  if (iso === hoje) return 'hoje';
  if (iso === somarDias(hoje, 1)) return `amanhã (${diaSemana}, ${data})`;
  return `${diaSemana}, ${data}`;
}

function saudacao(cliente?: Cliente): string {
  return `Olá${cliente ? `, ${cliente.nome.split(' ')[0]}` : ''}!`;
}

function linhaPagamento(pedido: Pedido): string {
  const falta = faltaReceber(pedido);
  if (falta <= 0) return '';
  return `\nFica pendente o valor de *${formatarMoeda(falta)}* (Pix: ${empresa.pixChave}, dinheiro ou cartão).`;
}

function numero(pedido: Pedido): string {
  return numeroPedido(pedido).slice(1);
}

function montar(linhas: string[]): string {
  return linhas.join('\n');
}

export function lembreteDevolucao(pedido: Pedido, cliente?: Cliente): string {
  return montar([
    `🔔 *Lembrete automático — ${empresa.nome}*`,
    '',
    `${saudacao(cliente)} A devolução dos itens do pedido nº ${numero(pedido)} está marcada para *${quandoPorExtenso(pedido.devolucao)}*.${linhaPagamento(pedido)}`,
    '',
    'Qualquer dúvida, é só responder esta mensagem.',
    '',
    RODAPE_AUTOMATICO,
  ]);
}

export function lembreteRetirada(pedido: Pedido, cliente?: Cliente): string {
  return montar([
    `🔔 *Lembrete automático — ${empresa.nome}*`,
    '',
    `${saudacao(cliente)} A retirada dos itens do pedido nº ${numero(pedido)} está marcada para *${quandoPorExtenso(pedido.retirada)}*.${linhaPagamento(pedido)}`,
    '',
    'Qualquer dúvida, é só responder esta mensagem.',
    '',
    RODAPE_AUTOMATICO,
  ]);
}

/** Resumo do pedido que acompanha a nota. */
export function resumoPedido(pedido: Pedido, cliente: Cliente | undefined, nomeItem: (id: string) => string): string {
  const total = totalPedido(pedido);
  const pago = totalPago(pedido);
  const falta = faltaReceber(pedido);
  const dataBR = (iso: string) => deISO(iso).toLocaleDateString('pt-BR');
  return montar([
    `📄 *Resumo do pedido nº ${numero(pedido)} — ${empresa.nome}*`,
    '',
    saudacao(cliente),
    '',
    ...pedido.itens.map((i) => `• ${i.quantidade}× ${nomeItem(i.itemId)} — ${formatarMoeda(i.quantidade * i.valorUnitario)}`),
    '',
    `Retirada: ${dataBR(pedido.retirada)}`,
    `Devolução: ${dataBR(pedido.devolucao)}`,
    '',
    `Total: ${formatarMoeda(total)}`,
    ...(pago > 0 ? [`Já pago: ${formatarMoeda(pago)}`] : []),
    `*A pagar: ${formatarMoeda(falta)}*`,
    '',
    'Pagamento em Pix, dinheiro ou cartão.',
    `Pix: ${empresa.pixChave} (${empresa.pixTitular})`,
    '',
    RODAPE_AUTOMATICO,
  ]);
}
