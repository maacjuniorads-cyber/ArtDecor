/**
 * Textos prontos para enviar ao cliente pelo WhatsApp.
 *
 * - Identificados como mensagens automáticas do sistema da ArtDecor
 *   (quem envia não precisa "assinar" o lembrete/cobrança pessoalmente).
 * - Tom acolhedor: saudação pelo horário, clima positivo antes do aviso,
 *   pedido leve ("só para lembrar") e agradecimento no fim.
 * - No WhatsApp, *texto* vira negrito e _texto_ vira itálico.
 * - Sem emojis: o link wa.me estraga emojis (chegam como "�" no cliente).
 *   Símbolos simples como • — × passam sem problema.
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

/** "Bom dia", "Boa tarde" ou "Boa noite", pelo horário de quem envia. */
export function cumprimento(agora: Date = new Date()): string {
  const h = agora.getHours();
  if (h >= 5 && h < 12) return 'Bom dia';
  if (h >= 12 && h < 18) return 'Boa tarde';
  return 'Boa noite';
}

function saudacao(cliente?: Cliente): string {
  return `${cumprimento()}${cliente ? `, ${cliente.nome.split(' ')[0]}` : ''}! Tudo bem?`;
}

function linhaPagamento(pedido: Pedido): string[] {
  const falta = faltaReceber(pedido);
  if (falta <= 0) return [];
  return [`Fica pendente o valor de *${formatarMoeda(falta)}* — Pix ${empresa.pixChave}, dinheiro ou cartão, como preferir.`];
}

function numero(pedido: Pedido): string {
  return numeroPedido(pedido).slice(1);
}

function montar(linhas: string[]): string {
  return linhas.join('\n');
}

const TITULO_LEMBRETE = `*Lembrete automático — ${empresa.nome}*`;

export function lembreteRetirada(pedido: Pedido, cliente?: Cliente): string {
  return montar([
    TITULO_LEMBRETE,
    '',
    saudacao(cliente),
    'O grande dia está chegando! Já estamos separando tudo com carinho para a sua festa.',
    '',
    `Passando só para lembrar que a retirada dos itens (pedido nº ${numero(pedido)}) está marcada para *${quandoPorExtenso(pedido.retirada)}*.`,
    ...linhaPagamento(pedido),
    '',
    'Qualquer dúvida, é só responder esta mensagem. Até lá!',
    '',
    RODAPE_AUTOMATICO,
  ]);
}

export function lembreteDevolucao(pedido: Pedido, cliente?: Cliente): string {
  const hoje = hojeISO();
  const atrasado = pedido.devolucao < hoje;
  return montar([
    TITULO_LEMBRETE,
    '',
    saudacao(cliente),
    `Esperamos que a festa tenha ficado linda e que as peças da ${empresa.nome} tenham deixado tudo ainda mais especial!`,
    '',
    atrasado
      ? `A devolução dos itens (pedido nº ${numero(pedido)}) estava marcada para *${quandoPorExtenso(pedido.devolucao)}*. Pode nos avisar quando fica melhor para devolver?`
      : `Passando só para lembrar que a devolução dos itens (pedido nº ${numero(pedido)}) está marcada para *${quandoPorExtenso(pedido.devolucao)}*.`,
    ...linhaPagamento(pedido),
    '',
    'Qualquer dúvida, é só responder esta mensagem. Agradecemos pela confiança!',
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
    `*Resumo do pedido nº ${numero(pedido)} — ${empresa.nome}*`,
    '',
    saudacao(cliente),
    `Muito obrigado por escolher a ${empresa.nome}! Segue o resumo do seu pedido (a nota vai junto):`,
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
    `Pagamento em Pix, dinheiro ou cartão — Pix ${empresa.pixChave} (${empresa.pixTitular}).`,
    '',
    'Qualquer dúvida, é só responder esta mensagem.',
    '',
    RODAPE_AUTOMATICO,
  ]);
}

/** Exemplo usado no tutorial para mostrar como a mensagem chega no cliente. */
export function exemploLembrete(): string {
  const hoje = hojeISO();
  const pedido: Pedido = {
    id: 'exemplo',
    numero: 12,
    clienteId: 'exemplo',
    temaIds: [],
    itens: [{ itemId: 'x', quantidade: 1, valorUnitario: 150 }],
    retirada: somarDias(hoje, -2),
    devolucao: somarDias(hoje, 1),
    status: 'rua',
    pagamentos: [{ id: 'p', valor: 80, data: hoje, forma: 'Pix' }],
  };
  return lembreteDevolucao(pedido, { id: 'exemplo', nome: 'Maria Silva', telefone: '', veiculo: null });
}
