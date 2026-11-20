/**
 * Dados de EXEMPLO usados só durante o tutorial.
 * Ficam apenas na memória do aparelho (nunca são gravados no banco) e somem
 * quando o tutorial termina. Todos os ids começam com "exemplo-".
 */
import { hojeISO, somarDias } from '@/lib/formato';
import type { Cliente, Item, Pedido, Tema } from '@/types';

export const PREFIXO_EXEMPLO = 'exemplo-';

export const ehExemplo = (id: string) => id.startsWith(PREFIXO_EXEMPLO);

/** Id do pedido de exemplo que o tutorial abre (reservado, com sinal). */
export const PEDIDO_EXEMPLO_TOUR = 'exemplo-ped-silvia';

export function dadosDeExemplo(): { temas: Tema[]; itens: Item[]; clientes: Cliente[]; pedidos: Pedido[] } {
  const hoje = hojeISO();
  const d = (n: number) => somarDias(hoje, n);

  const temas: Tema[] = [{ id: 'exemplo-tema-unicornio', nome: 'Unicórnio (exemplo)', cor: '#D9718F' }];

  const itens: Item[] = [
    { id: 'exemplo-item-painel', nome: 'Painel redondo Unicórnio (exemplo)', categoria: 'Painéis', temaId: 'exemplo-tema-unicornio', tipo: 'unica', quantidadeTotal: 1, valorAluguel: 60 },
    { id: 'exemplo-item-capas', nome: 'Trio de capas Unicórnio (exemplo)', categoria: 'Painéis', temaId: 'exemplo-tema-unicornio', tipo: 'unica', quantidadeTotal: 1, valorAluguel: 45 },
    { id: 'exemplo-item-bandeja', nome: 'Bandeja espelhada (exemplo)', categoria: 'Vidros', tipo: 'varios', quantidadeTotal: 10, valorAluguel: 6 },
    { id: 'exemplo-item-toalha', nome: 'Toalha rosé (exemplo)', categoria: 'Toalhas', tipo: 'varios', quantidadeTotal: 8, valorAluguel: 8 },
  ];

  const clientes: Cliente[] = [
    {
      id: 'exemplo-cli-silvia',
      nome: 'Silvia Exemplo',
      telefone: '(53) 90000-0000',
      endereco: 'Rua do Exemplo, 100, Centro',
      veiculo: { tipo: 'Carro', modelo: 'Onix', cor: 'prata', placa: 'EXE1A23' },
    },
    { id: 'exemplo-cli-joao', nome: 'João Exemplo', telefone: '(53) 90000-0001', veiculo: null },
  ];

  const pedidos: Pedido[] = [
    {
      id: PEDIDO_EXEMPLO_TOUR,
      numero: 101,
      clienteId: 'exemplo-cli-silvia',
      evento: 'Aniversário de 7 anos',
      temaIds: ['exemplo-tema-unicornio'],
      itens: [
        { itemId: 'exemplo-item-painel', quantidade: 1, valorUnitario: 60 },
        { itemId: 'exemplo-item-capas', quantidade: 1, valorUnitario: 45 },
        { itemId: 'exemplo-item-bandeja', quantidade: 4, valorUnitario: 6 },
      ],
      retirada: d(1),
      devolucao: d(3),
      status: 'reservado',
      pagamentos: [{ id: 'exemplo-pg-1', valor: 50, data: d(-2), forma: 'Pix' }],
      cobrancas: [],
    },
    {
      id: 'exemplo-ped-joao',
      numero: 102,
      clienteId: 'exemplo-cli-joao',
      evento: 'Jantar de família',
      temaIds: [],
      itens: [
        { itemId: 'exemplo-item-toalha', quantidade: 6, valorUnitario: 8 },
        { itemId: 'exemplo-item-bandeja', quantidade: 4, valorUnitario: 6 },
      ],
      retirada: d(-2),
      devolucao: d(0),
      status: 'rua',
      pagamentos: [{ id: 'exemplo-pg-2', valor: 30, data: d(-3), forma: 'Dinheiro' }],
      cobrancas: [],
    },
  ];

  return { temas, itens, clientes, pedidos };
}
